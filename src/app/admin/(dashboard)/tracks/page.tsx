import { getAllTracks, getAllCollections } from "@/lib/db/queries";
import { buildTrackMediaUrls } from "@/lib/s3/client";
import { TracksManager } from "@/components/admin/TracksManager";

export default async function AdminTracksPage() {
  const [tracks, collections] = await Promise.all([
    getAllTracks(),
    getAllCollections(),
  ]);

  const tracksWithUrls = tracks.map((t) => ({
    ...t,
    ...buildTrackMediaUrls(t),
  }));

  return (
    <TracksManager
      tracks={tracksWithUrls}
      collections={collections.map((c) => ({ id: c.id, title: c.title }))}
    />
  );
}
