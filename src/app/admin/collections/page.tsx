import { getAllCollections, getTracksByCollection } from "@/lib/db/queries";
import { buildCollectionMediaUrls } from "@/lib/s3/client";
import { CollectionsManager } from "@/components/admin/CollectionsManager";

export default async function AdminCollectionsPage() {
  const collections = await getAllCollections();

  const collectionsWithDetails = await Promise.all(
    collections.map(async (c) => {
      const tracks = await getTracksByCollection(c.id);
      return {
        ...c,
        ...buildCollectionMediaUrls(c),
        trackCount: tracks.length,
      };
    })
  );

  return <CollectionsManager collections={collectionsWithDetails} />;
}
