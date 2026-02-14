import { notFound } from "next/navigation";
import { getCollectionById, getTracksByCollection } from "@/lib/db/queries";
import { buildCollectionMediaUrls, buildTrackMediaUrls } from "@/lib/s3/client";
import { EditCollection } from "@/components/admin/EditCollection";

interface EditCollectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCollectionPage({
  params,
}: EditCollectionPageProps) {
  const { id } = await params;
  const collection = await getCollectionById(id);

  if (!collection) notFound();

  const tracks = await getTracksByCollection(id);
  const tracksWithUrls = tracks.map((t) => ({
    ...t,
    ...buildTrackMediaUrls(t),
  }));

  return (
    <EditCollection
      collection={{
        ...collection,
        ...buildCollectionMediaUrls(collection),
      }}
      tracks={tracksWithUrls}
    />
  );
}
