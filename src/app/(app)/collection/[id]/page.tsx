import { notFound } from "next/navigation";
import {
  getCollectionById,
  getTracksByCollection,
} from "@/lib/db/queries";
import { buildCollectionMediaUrls, buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";
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

  const rawTracks = await getTracksByCollection(collection.id);

  // Resolve media URLs
  const collectionWithUrls = {
    ...collection,
    ...buildCollectionMediaUrls(collection),
  };

  const tracks = rawTracks.map((t) => ({
    ...t,
    ...buildTrackMediaUrlsWithFallback(t, collection.artworkKey),
  }));

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
