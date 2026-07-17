import {
  getAllCollections,
  getCollectionById,
  getConsumedFreeListenTrackIds,
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
      const queueTracks = await getTracksByCollection(track.collectionId);

      // Which of these tracks has this free user already used their listen on?
      const consumed =
        access.tier === "free" && access.userId
          ? new Set(
              await getConsumedFreeListenTrackIds(
                access.userId,
                [track.id, ...queueTracks.map((t) => t.id)]
              )
            )
          : new Set<string>();

      const avail = (tid: string) =>
        access.tier === "free" &&
        !sacred7TrackIds.includes(tid) &&
        !consumed.has(tid);

      const featuredFull = canPlayFullTrack(
        access.tier,
        track.id,
        sacred7TrackIds,
        avail(track.id)
      );
      featuredTrack = {
        ...track,
        ...buildTrackMediaUrlsWithFallback(track, collectionArtworkKey),
        audioUrl: track.audioKey ? `/api/tracks/${track.id}/audio` : null,
        isLocked: !featuredFull,
        previewDuration: featuredFull ? track.duration : previewDur,
        isFreeListen: avail(track.id),
        isFeatured: true,
      };

      featuredQueue = queueTracks.map((t) => {
        const tFull = canPlayFullTrack(
          access.tier,
          t.id,
          sacred7TrackIds,
          avail(t.id)
        );
        return {
          ...t,
          ...buildTrackMediaUrlsWithFallback(t, collectionArtworkKey),
          audioUrl: t.audioKey ? `/api/tracks/${t.id}/audio` : null,
          isLocked: !tFull,
          previewDuration: tFull ? t.duration : previewDur,
          isFreeListen: avail(t.id),
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
