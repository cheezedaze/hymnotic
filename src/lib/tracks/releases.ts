import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements, pushNotifications, trackReleases, tracks } from "@/lib/db/schema";
import { sendBroadcast } from "@/lib/push/send";
import { assertTrackAudio, parseReleaseInput, TrackReleaseError } from "./validation";

export async function getTrackRelease(trackId: string) {
  const [release] = await db.select().from(trackReleases).where(eq(trackReleases.trackId, trackId));
  return release ?? null;
}

export async function scheduleTrackRelease(trackId: string, body: Record<string, unknown>) {
  const input = parseReleaseInput(body);
  return db.transaction(async (tx) => {
    const [track] = await tx.select().from(tracks).where(eq(tracks.id, trackId)).for("update");
    if (!track) throw new TrackReleaseError("Track not found", 404);
    if (track.isActive) throw new TrackReleaseError("This track is already active. Deactivate it before scheduling another release.", 409);
    await assertTrackAudio(track.audioKey);
    const [existing] = await tx.select().from(trackReleases).where(eq(trackReleases.trackId, trackId));
    if (existing && ["published", "sending"].includes(existing.status)) throw new TrackReleaseError("Push delivery is still in progress. Wait for it to finish before scheduling another release.", 409);
    const [release] = await tx.insert(trackReleases).values({ trackId, ...input })
      .onConflictDoUpdate({ target: trackReleases.trackId, set: { ...input, status: "scheduled", error: null, sentCount: 0, failedCount: 0, updatedAt: new Date() } }).returning();
    return release;
  });
}

export async function cancelTrackRelease(trackId: string) {
  await db.transaction(async (tx) => {
    await tx.select().from(tracks).where(eq(tracks.id, trackId)).for("update");
    const [release] = await tx.select().from(trackReleases).where(eq(trackReleases.trackId, trackId));
    if (release && release.status !== "scheduled") throw new TrackReleaseError("The release has already started and cannot be canceled.", 409);
    await tx.delete(trackReleases).where(eq(trackReleases.trackId, trackId));
  });
}

export async function processTrackRelease(trackId: string, now = new Date()) {
  // Serialize announcement replacement across different releases. A rollback
  // leaves both the track and previous announcement unchanged.
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(721947031)`);
    const [track] = await tx.select().from(tracks).where(eq(tracks.id, trackId)).for("update");
    const [release] = await tx.select().from(trackReleases).where(eq(trackReleases.trackId, trackId)).for("update");
    if (!track || !release || release.status !== "scheduled" || release.scheduledAt > now) return;
    await assertTrackAudio(track.audioKey);
    await tx.update(tracks).set({ isActive: true, publishedAt: now, updatedAt: now }).where(eq(tracks.id, trackId));
    if (release.announcementTitle && release.announcementBody) {
      await tx.update(announcements).set({ firstPublishedAt: sql`coalesce(${announcements.firstPublishedAt}, ${announcements.publishedAt})`, publishedAt: null, updatedAt: now });
      await tx.insert(announcements).values({ title: release.announcementTitle, body: release.announcementBody, publishedAt: now, firstPublishedAt: now });
    }
    await tx.update(trackReleases).set({
      status: release.pushTitle ? "published" : "completed", error: null, updatedAt: now,
    }).where(eq(trackReleases.trackId, trackId));
  });

  // A durable, atomic claim prevents concurrent cron calls or a repeated click
  // from broadcasting twice. Never automatically resend an uncertain attempt.
  const [claimed] = await db.update(trackReleases).set({ status: "sending", updatedAt: new Date() })
    .where(and(eq(trackReleases.trackId, trackId), eq(trackReleases.status, "published"))).returning();
  if (claimed) {
    try {
      const counts = await sendBroadcast({ title: claimed.pushTitle!, body: claimed.pushBody! });
      await db.transaction(async (tx) => {
        await tx.insert(pushNotifications).values({ title: claimed.pushTitle!, body: claimed.pushBody!, ...counts });
        await tx.update(trackReleases).set({
          status: counts.failedCount > 0 ? "attention" : "completed",
          error: counts.failedCount > 0 ? `Push delivery failed for ${counts.failedCount} device(s). ${counts.sentCount} sent.` : null,
          ...counts, updatedAt: new Date(),
        }).where(and(eq(trackReleases.trackId, trackId), eq(trackReleases.status, "sending"), eq(trackReleases.updatedAt, claimed.updatedAt)));
      });
    } catch (error) {
      console.error("Track release push failed:", error);
      await db.update(trackReleases).set({
        status: "attention",
        error: "The track was released, but push delivery could not be confirmed. Check Push Notifications before sending again; some devices may already have received it.",
        updatedAt: new Date(),
      }).where(and(eq(trackReleases.trackId, trackId), eq(trackReleases.status, "sending"), eq(trackReleases.updatedAt, claimed.updatedAt)));
    }
  }
  return getTrackRelease(trackId);
}

export async function processDueTrackReleases(now = new Date()) {
  await db.update(trackReleases).set({
    status: "attention",
    error: "The track was released, but push delivery was interrupted. Check Push Notifications before sending again; some devices may already have received it.",
    updatedAt: now,
  }).where(and(eq(trackReleases.status, "sending"), lte(trackReleases.updatedAt, new Date(now.getTime() - 10 * 60_000))));

  const due = await db.select().from(trackReleases)
    .where(and(inArray(trackReleases.status, ["scheduled", "published"]), lte(trackReleases.scheduledAt, now)))
    .orderBy(asc(trackReleases.scheduledAt)).limit(20);
  const results = [];
  for (const release of due) {
    try {
      const result = await processTrackRelease(release.trackId, now);
      results.push({ trackId: release.trackId, status: result?.status });
    } catch (error) {
      console.error("Track release failed:", release.trackId, error);
      const message = error instanceof TrackReleaseError ? error.message : "Release failed. The scheduler will retry; check the server logs.";
      await db.update(trackReleases).set({ error: message, updatedAt: now })
        .where(and(eq(trackReleases.trackId, release.trackId), eq(trackReleases.status, "scheduled")));
      results.push({ trackId: release.trackId, error: message });
    }
  }
  return results;
}
