import {
  getAllCollections,
  getCollectionById,
  getFeaturedContent,
  getTrackById,
  getTracksByCollection,
} from "@/lib/db/queries";
import { buildCollectionMediaUrls, buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";
import { type ApiTrack, type ApiCollection } from "@/lib/types";
import { HomePageContent } from "@/components/home/HomePageContent";

export default async function HomePage() {
  const [collections, featured] = await Promise.all([
    getAllCollections(),
    getFeaturedContent(),
  ]);

  // Resolve collection media URLs
  const collectionsWithUrls = collections.map((c) => ({
    ...c,
    ...buildCollectionMediaUrls(c),
  }));

  // Get the featured track (first featured item of type "track")
  const featuredItem = featured.find((f) => f.type === "track");
  let featuredTrack: ApiTrack | null = null;
  let featuredQueue: ApiTrack[] = [];

  if (featuredItem) {
    const track = await getTrackById(featuredItem.referenceId);
    if (track) {
      const collection = await getCollectionById(track.collectionId);
      const collectionArtworkKey = collection?.artworkKey ?? null;
      featuredTrack = { ...track, ...buildTrackMediaUrlsWithFallback(track, collectionArtworkKey) };
      const queueTracks = await getTracksByCollection(track.collectionId);
      featuredQueue = queueTracks.map((t) => ({
        ...t,
        ...buildTrackMediaUrlsWithFallback(t, collectionArtworkKey),
      }));
    }
  }

  return (
    <HomePageContent
      collections={collectionsWithUrls as ApiCollection[]}
      featuredTrack={featuredTrack}
      featuredQueue={featuredQueue}
    />
  );
}
