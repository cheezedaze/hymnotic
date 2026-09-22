import { getTrackRelease } from "@/lib/tracks/releases";
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

  const [lyrics, collections, release] = await Promise.all([
    getLyricsByTrackId(id),
    getAllCollections(),
    getTrackRelease(id),
  ]);

  return (
    <EditTrack
      key={id}
      release={release}
      track={{ ...track, ...buildTrackMediaUrls(track), audioUrl: track.audioKey ? `/api/tracks/${track.id}/audio` : null }}
      lyrics={lyrics}
      collections={collections.map((c) => ({ id: c.id, title: c.title }))}
    />
  );
}
