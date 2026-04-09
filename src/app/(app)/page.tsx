import {
  getAllCollections,
  getCollectionById,
  getFeaturedContent,
  getTrackById,
  getTracksByCollection,
} from "@/lib/db/queries";
import { buildCollectionMediaUrls, buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";
import {
  getAccessContext,
  getSacred7TrackIds,
  canPlayFullTrack,
  getPreviewDuration,
} from "@/lib/auth/access";
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

  // Access context for preview enforcement
  const access = await getAccessContext();
  const sacred7TrackIds = await getSacred7TrackIds();
  const previewDur = getPreviewDuration(access.tier);

  // Get the featured track (first featured item of type "track")
  const featuredItem = featured.find((f) => f.type === "track");
  let featuredTrack: ApiTrack | null = null;
  let featuredQueue: ApiTrack[] = [];

  if (featuredItem) {
    const track = await getTrackById(featuredItem.referenceId);
    if (track) {
      const collection = await getCollectionById(track.collectionId);
      const collectionArtworkKey = collection?.artworkKey ?? null;
      featuredTrack = {
        ...track,
        ...buildTrackMediaUrlsWithFallback(track, collectionArtworkKey),
        isLocked: false,
        previewDuration: track.duration,
        isFeatured: true,
      };
      const queueTracks = await getTracksByCollection(track.collectionId);
      featuredQueue = queueTracks.map((t) => {
        const tFull = canPlayFullTrack(access.tier, t.id, sacred7TrackIds);
        return {
          ...t,
          ...buildTrackMediaUrlsWithFallback(t, collectionArtworkKey),
          isLocked: !tFull,
          previewDuration: tFull ? t.duration : previewDur,
        };
      });
    }
  }

  return (
    <HomePageContent
      collections={collectionsWithUrls as ApiCollection[]}
      featuredTrack={featuredTrack}
      featuredQueue={featuredQueue}
      serverTier={access.tier}
    />
  );
}
