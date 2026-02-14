import { notFound } from "next/navigation";
import { getCollectionById } from "@/lib/data/collections";
import { getTracksByCollection } from "@/lib/data/tracks";
import { CollectionHeader } from "@/components/collection/CollectionHeader";
import { ActionRow } from "@/components/collection/ActionRow";
import { TrackList } from "@/components/collection/TrackList";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params;
  const collection = getCollectionById(id);

  if (!collection) {
    notFound();
  }

  const tracks = getTracksByCollection(collection.id);

  return (
    <div className="min-h-dvh">
      <CollectionHeader collection={collection} />
      <ActionRow tracks={tracks} />
      <TrackList tracks={tracks} />
    </div>
  );
}
