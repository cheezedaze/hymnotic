import { notFound } from "next/navigation";
import {
  getCollectionById,
  getTracksByCollection,
} from "@/lib/db/queries";
import { buildCollectionMediaUrls, buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";
import { CollectionHeader } from "@/components/collection/CollectionHeader";
import { ActionRow } from "@/components/collection/ActionRow";
import { TrackList } from "@/components/collection/TrackList";
import { FavoritesCollection } from "@/components/collection/FavoritesCollection";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params;

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
      <ActionRow tracks={tracks} />
      <TrackList tracks={tracks} />
    </div>
  );
}
