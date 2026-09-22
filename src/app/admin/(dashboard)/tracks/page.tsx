import { db } from "@/lib/db";
import { trackReleases } from "@/lib/db/schema";
import { getAllTracks, getAllCollections } from "@/lib/db/queries";
import { buildTrackMediaUrls } from "@/lib/s3/client";
import { TracksManager } from "@/components/admin/TracksManager";

export default async function AdminTracksPage() {
  const [tracks, collections, releases] = await Promise.all([
    getAllTracks(),
    getAllCollections(),
    db.select().from(trackReleases),
  ]);

  const tracksWithUrls = tracks.map((t) => ({
    ...t,
    ...buildTrackMediaUrls(t),
    releaseScheduledAt: releases.find((r) => r.trackId === t.id && r.status === "scheduled")?.scheduledAt.toISOString() || null,
    releaseError: releases.find((r) => r.trackId === t.id)?.error || null,
  }));

  return (
    <TracksManager
      tracks={tracksWithUrls}
      collections={collections.map((c) => ({ id: c.id, title: c.title }))}
    />
  );
}
