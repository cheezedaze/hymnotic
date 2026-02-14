import { notFound } from "next/navigation";
import {
  getTrackById,
  getLyricsByTrackId,
  getAllCollections,
} from "@/lib/db/queries";
import { buildTrackMediaUrls } from "@/lib/s3/client";
import { EditTrack } from "@/components/admin/EditTrack";

interface EditTrackPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTrackPage({ params }: EditTrackPageProps) {
  const { id } = await params;
  const track = await getTrackById(id);

  if (!track) notFound();

  const [lyrics, collections] = await Promise.all([
    getLyricsByTrackId(id),
    getAllCollections(),
  ]);

  return (
    <EditTrack
      track={{ ...track, ...buildTrackMediaUrls(track) }}
      lyrics={lyrics}
      collections={collections.map((c) => ({ id: c.id, title: c.title }))}
    />
  );
}
