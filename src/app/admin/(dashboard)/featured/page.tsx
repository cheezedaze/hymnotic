import {
  getFeaturedContent,
  getAllCollections,
  getAllTracks,
} from "@/lib/db/queries";
import { buildTrackMediaUrls, buildCollectionMediaUrls } from "@/lib/s3/client";
import { FeaturedManager } from "@/components/admin/FeaturedManager";

export default async function FeaturedPage() {
  const [featured, collections, tracks] = await Promise.all([
    getFeaturedContent(),
    getAllCollections(),
    getAllTracks(),
  ]);

  // Resolve media URLs for tracks and collections so the client can display them
  const tracksWithUrls = tracks.map((t) => ({
    ...t,
    ...buildTrackMediaUrls(t),
  }));

  const collectionsWithUrls = collections.map((c) => ({
    ...c,
    ...buildCollectionMediaUrls(c),
  }));

  return (
    <FeaturedManager
      featured={featured}
      tracks={tracksWithUrls}
      collections={collectionsWithUrls}
    />
  );
}
