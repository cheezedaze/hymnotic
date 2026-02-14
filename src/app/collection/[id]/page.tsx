import { notFound } from "next/navigation";
import {
  getCollectionById,
  getTracksByCollection,
} from "@/lib/db/queries";
import { buildCollectionMediaUrls, buildTrackMediaUrls } from "@/lib/s3/client";
import { CollectionHeader } from "@/components/collection/CollectionHeader";
import { ActionRow } from "@/components/collection/ActionRow";
import { TrackList } from "@/components/collection/TrackList";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params;
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
    ...buildTrackMediaUrls(t),
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
