import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { readFile } from "node:fs/promises";

// Opt-in integration tests. Use a disposable local DB initialized with db:push.
// Never fall back to DATABASE_URL (which may point to production).
const url = process.env.TRACK_RELEASE_TEST_DATABASE_URL;
const mocks = vi.hoisted(() => ({ mediaExists: vi.fn(), sendBroadcast: vi.fn() }));
vi.mock("@/lib/s3/client", () => ({ mediaExists: mocks.mediaExists }));
vi.mock("@/lib/push/send", () => ({ sendBroadcast: mocks.sendBroadcast }));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/db/index", () => ({ db }));

const client = url ? postgres(url, { max: 10, prepare: false, onnotice: () => {} }) : null;
export const db = client ? drizzle(client, { schema }) : null!;
let releases: typeof import("./releases");
let queries: typeof import("@/lib/db/queries");

describe.skipIf(!url)("track releases (local PostgreSQL)", () => {
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error("Integration tests require a disposable localhost database");
    releases = await import("./releases");
    queries = await import("@/lib/db/queries");
  });
  beforeEach(async () => {
    await client!`TRUNCATE tracks, collections, announcements, push_notifications CASCADE`;
    mocks.mediaExists.mockReset().mockResolvedValue(true);
    mocks.sendBroadcast.mockReset().mockResolvedValue({ sentCount: 5, failedCount: 0 });
    await db.insert(schema.collections).values({ id: "collection", title: "Collection" });
  });
  afterAll(async () => { await client?.end(); });

  const track = (id = "track", extra = {}) => db.insert(schema.tracks).values({ id, title: id, collectionId: "collection", duration: 100, trackNumber: 1, audioKey: "audio/tracks/song.mp3", ...extra }).returning();
  const campaign = { immediate: true, announcementTitle: "New song", announcementBody: "<p>Listen now</p>", pushTitle: "New song", pushBody: "Listen now" };
  const getTrack = async (id = "track") => (await db.select().from(schema.tracks).where(eq(schema.tracks.id, id)))[0];

  it("creates inactive tracks even if a caller requests active", async () => {
    const result = await queries.createTrack({ id: "track", title: "Track", collectionId: "collection", duration: 0, trackNumber: 1, isActive: true });
    expect(result.isActive).toBe(false);
    expect(result.publishedAt).toBeNull();
  });
  it("defaults direct inserts to inactive and blocks activation outside first release", async () => {
    const [created] = await track();
    expect(created.isActive).toBe(false);
    await expect(queries.updateTrack("track", { isActive: true })).rejects.toThrow("Release Track");
  });
  it("keeps future releases inactive and supports rescheduling and cancellation", async () => {
    await track();
    const future = new Date(Date.now() + 86_400_000);
    await releases.scheduleTrackRelease("track", { ...campaign, immediate: false, scheduledAt: future.toISOString() });
    await releases.processDueTrackReleases();
    expect((await getTrack()).isActive).toBe(false);
    expect(mocks.sendBroadcast).not.toHaveBeenCalled();
    future.setDate(future.getDate() + 1);
    await releases.scheduleTrackRelease("track", { ...campaign, immediate: false, scheduledAt: future.toISOString() });
    expect((await releases.getTrackRelease("track"))?.scheduledAt).toEqual(future);
    await releases.cancelTrackRelease("track");
    await releases.processDueTrackReleases(future);
    expect((await getTrack()).isActive).toBe(false);
    expect(await releases.getTrackRelease("track")).toBeNull();
  });
  it("activates only when due, replaces all announcements, and broadcasts once under concurrent calls", async () => {
    await track();
    await db.insert(schema.announcements).values([{ title: "Old", body: "old", publishedAt: new Date() }, { title: "Older", body: "old", publishedAt: new Date() }]);
    await releases.scheduleTrackRelease("track", campaign);
    await Promise.all([releases.processTrackRelease("track"), releases.processTrackRelease("track"), releases.processDueTrackReleases()]);
    expect((await getTrack()).isActive).toBe(true);
    expect((await getTrack()).publishedAt).not.toBeNull();
    const announcements = await db.select().from(schema.announcements);
    expect(announcements.filter((a) => a.publishedAt).map((a) => a.title)).toEqual(["New song"]);
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
    expect(await db.select().from(schema.pushNotifications)).toHaveLength(1);
    expect((await releases.getTrackRelease("track"))?.status).toBe("completed");
    await queries.updateTrack("track", { isActive: false });
    await queries.updateTrack("track", { isActive: true });
    await releases.processDueTrackReleases();
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
    await expect(releases.scheduleTrackRelease("track", campaign)).rejects.toThrow("already active");
  });
  it("schedules a previously activated inactive track and can activate it immediately", async () => {
    await track("track", { publishedAt: new Date(), isActive: false });
    const future = new Date(Date.now() + 86_400_000);
    await releases.scheduleTrackRelease("track", { ...campaign, immediate: false, scheduledAt: future.toISOString() });
    await releases.processDueTrackReleases();
    expect((await getTrack()).isActive).toBe(false);
    expect(mocks.sendBroadcast).not.toHaveBeenCalled();
    await expect(queries.updateTrack("track", { isActive: true })).rejects.toThrow("Release now");
    await releases.scheduleTrackRelease("track", campaign);
    await releases.processTrackRelease("track");
    expect((await getTrack()).isActive).toBe(true);
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
  });
  it("starts a fresh campaign after deactivation and sends it once when due", async () => {
    await track();
    await releases.scheduleTrackRelease("track", campaign);
    await releases.processTrackRelease("track");
    await queries.updateTrack("track", { isActive: false });
    const future = new Date(Date.now() + 86_400_000);
    const scheduled = await releases.scheduleTrackRelease("track", { ...campaign, announcementTitle: "Another release", immediate: false, scheduledAt: future.toISOString() });
    expect(scheduled.status).toBe("scheduled");
    expect(scheduled.sentCount).toBe(0);
    expect(scheduled.failedCount).toBe(0);
    await releases.processDueTrackReleases();
    expect((await getTrack()).isActive).toBe(false);
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
    await Promise.all([releases.processDueTrackReleases(future), releases.processTrackRelease("track", future)]);
    expect((await getTrack()).isActive).toBe(true);
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(2);
    expect((await db.select().from(schema.announcements)).filter((a) => a.publishedAt).map((a) => a.title)).toEqual(["Another release"]);
  });
  it("can cancel a repeat release and activate normally without repeating its campaign", async () => {
    await track();
    await releases.scheduleTrackRelease("track", campaign);
    await releases.processTrackRelease("track");
    await queries.updateTrack("track", { isActive: false });
    const future = new Date(Date.now() + 86_400_000);
    await releases.scheduleTrackRelease("track", { ...campaign, immediate: false, scheduledAt: future.toISOString() });
    await releases.cancelTrackRelease("track");
    await releases.processDueTrackReleases(future);
    expect((await getTrack()).isActive).toBe(false);
    await queries.updateTrack("track", { isActive: true });
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
  });
  it("allows a new release after a previous push failure and clears its delivery state", async () => {
    await track();
    mocks.sendBroadcast.mockResolvedValueOnce({ sentCount: 4, failedCount: 1 });
    await releases.scheduleTrackRelease("track", campaign);
    await releases.processTrackRelease("track");
    await queries.updateTrack("track", { isActive: false });
    const scheduled = await releases.scheduleTrackRelease("track", { immediate: true });
    expect(scheduled).toMatchObject({ status: "scheduled", sentCount: 0, failedCount: 0, error: null, pushTitle: null, announcementTitle: null });
    await releases.processTrackRelease("track");
    expect((await getTrack()).isActive).toBe(true);
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
  });
  it.each(["published", "sending"] as const)("does not replace a %s release while push delivery is in progress", async (status) => {
    await track("track", { publishedAt: new Date(), isActive: false });
    await db.insert(schema.trackReleases).values({ trackId: "track", scheduledAt: new Date(), status, pushTitle: "Original", pushBody: "Original message" });
    await expect(releases.scheduleTrackRelease("track", campaign)).rejects.toThrow("delivery is still in progress");
    expect((await releases.getTrackRelease("track"))?.pushTitle).toBe("Original");
  });
  it("does not let a late push result overwrite a newly scheduled release", async () => {
    await track();
    let finishPush!: (counts: { sentCount: number; failedCount: number }) => void;
    mocks.sendBroadcast.mockImplementationOnce(() => new Promise((resolve) => { finishPush = resolve; }));
    await releases.scheduleTrackRelease("track", campaign);
    const processing = releases.processTrackRelease("track");
    await vi.waitFor(() => expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1));
    try {
      await queries.updateTrack("track", { isActive: false });
      await db.update(schema.trackReleases).set({ updatedAt: new Date(Date.now() - 11 * 60_000) });
      await releases.processDueTrackReleases();
      expect((await releases.getTrackRelease("track"))?.status).toBe("attention");
      const future = new Date(Date.now() + 86_400_000);
      await releases.scheduleTrackRelease("track", { immediate: false, scheduledAt: future.toISOString() });
    } finally {
      finishPush({ sentCount: 5, failedCount: 0 });
      await processing;
    }
    expect(await releases.getTrackRelease("track")).toMatchObject({ status: "scheduled", sentCount: 0, failedCount: 0 });
    expect((await getTrack()).isActive).toBe(false);
  });
  it("rechecks audio at release time and retries safely after the audio is fixed", async () => {
    await track();
    await db.insert(schema.announcements).values({ title: "Old", body: "old", publishedAt: new Date() });
    await releases.scheduleTrackRelease("track", campaign);
    mocks.mediaExists.mockResolvedValue(false);
    await releases.processDueTrackReleases();
    expect((await getTrack()).isActive).toBe(false);
    expect((await db.select().from(schema.announcements))[0].publishedAt).not.toBeNull();
    expect((await releases.getTrackRelease("track"))?.error).toContain("verified");
    expect(mocks.sendBroadcast).not.toHaveBeenCalled();
    mocks.mediaExists.mockResolvedValue(true);
    await releases.processDueTrackReleases();
    expect((await getTrack()).isActive).toBe(true);
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
  });
  it("blocks removal of scheduled audio and refuses incomplete uploads", async () => {
    await track();
    mocks.mediaExists.mockResolvedValue(false);
    await expect(releases.scheduleTrackRelease("track", campaign)).rejects.toThrow("verified");
    expect(await releases.getTrackRelease("track")).toBeNull();
    mocks.mediaExists.mockResolvedValue(true);
    await releases.scheduleTrackRelease("track", campaign);
    await expect(queries.updateTrack("track", { audioKey: "" })).rejects.toThrow("Upload");
  });
  it("can release without announcement or push, preserving the current announcement", async () => {
    await track();
    await db.insert(schema.announcements).values({ title: "Old", body: "old", publishedAt: new Date() });
    await releases.scheduleTrackRelease("track", { immediate: true });
    await releases.processTrackRelease("track");
    expect((await getTrack()).isActive).toBe(true);
    expect((await db.select().from(schema.announcements))[0].publishedAt).not.toBeNull();
    expect(mocks.sendBroadcast).not.toHaveBeenCalled();
    expect((await releases.getTrackRelease("track"))?.status).toBe("completed");
  });
  it("surfaces partial push failure without broadcasting again", async () => {
    await track();
    mocks.sendBroadcast.mockResolvedValue({ sentCount: 4, failedCount: 1 });
    await releases.scheduleTrackRelease("track", campaign);
    await releases.processDueTrackReleases();
    await releases.processDueTrackReleases();
    expect((await releases.getTrackRelease("track"))?.status).toBe("attention");
    expect((await getTrack()).isActive).toBe(true);
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
  });
  it("does not repeat an uncertain or interrupted push", async () => {
    await track();
    mocks.sendBroadcast.mockRejectedValue(new Error("connection interrupted"));
    await releases.scheduleTrackRelease("track", campaign);
    await releases.processDueTrackReleases();
    await releases.processDueTrackReleases();
    expect((await releases.getTrackRelease("track"))?.status).toBe("attention");
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
    await db.update(schema.trackReleases).set({ status: "sending", updatedAt: new Date(Date.now() - 11 * 60_000) });
    await releases.processDueTrackReleases();
    expect((await releases.getTrackRelease("track"))?.error).toContain("interrupted");
    expect(mocks.sendBroadcast).toHaveBeenCalledTimes(1);
  });
  it("migrates existing tracks without changing their active state", async () => {
    await track("active", { isActive: true });
    await track("inactive", { isActive: false });
    await client!`DROP TABLE track_releases`;
    const connection = await client!.reserve();
    try {
      await connection.unsafe(await readFile(new URL("../../../drizzle/0013_track_releases.sql", import.meta.url), "utf8"));
    } finally { connection.release(); }
    expect((await getTrack("active")).isActive).toBe(true);
    expect((await getTrack("inactive")).isActive).toBe(false);
    expect((await getTrack("active")).publishedAt).not.toBeNull();
    expect((await getTrack("inactive")).publishedAt).not.toBeNull();
    const [created] = await track("new");
    expect(created.isActive).toBe(false);
    expect(created.publishedAt).toBeNull();
  });
});
