import { notFound } from "next/navigation";
import {
  getCollectionById,
  getTracksByCollection,
  getSacred7TracksWithDetails,
} from "@/lib/db/queries";
import { buildCollectionMediaUrls, buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";
import {
  getAccessContext,
  getSacred7TrackIds,
  canPlayFullTrack,
  getPreviewDuration,
} from "@/lib/auth/access";
import { CollectionHeader } from "@/components/collection/CollectionHeader";
import { CollectionContent } from "@/components/collection/CollectionContent";
import { FavoritesCollection } from "@/components/collection/FavoritesCollection";
import { AllTracksCollection } from "@/components/collection/AllTracksCollection";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params;

  // All Tracks: virtual collection showing every track
  if (id === "all-tracks") {
    return <AllTracksCollection />;
  }

  // Favorites collection: tracks are determined client-side
  if (id === "favorites") {
    const collection = await getCollectionById("favorites");
    const collectionWithUrls = collection
      ? { ...collection, ...buildCollectionMediaUrls(collection) }
      : null;
    return <FavoritesCollection collection={collectionWithUrls} />;
  }

  const collection = await getCollectionById(id);

  if (!collection) {
    notFound();
  }

  // Sacred 7 collections get tracks from junction table, not by collectionId
  const rawTracks = collection.isSacred7
    ? await getSacred7TracksWithDetails()
    : await getTracksByCollection(collection.id);

  // Access context for preview enforcement
  const access = await getAccessContext();
  const sacred7TrackIds = await getSacred7TrackIds();
  const previewDuration = getPreviewDuration(access.tier);

  // Resolve media URLs
  const collectionWithUrls = {
    ...collection,
    ...buildCollectionMediaUrls(collection),
  };

  const tracks = rawTracks.map((t) => {
    const isFull = canPlayFullTrack(access.tier, t.id, sacred7TrackIds);
    return {
      ...t,
      ...buildTrackMediaUrlsWithFallback(t, collection.artworkKey),
      isLocked: !isFull,
      previewDuration: isFull ? t.duration : previewDuration,
      isSacred7: sacred7TrackIds.includes(t.id),
    };
  });

  const trackCount = tracks.length;

  return (
    <div className="min-h-dvh">
      <CollectionHeader
        collection={collectionWithUrls}
        trackCount={trackCount}
      />
      <CollectionContent tracks={tracks} />
    </div>
  );
}
