import { getAllCollections } from "@/lib/db/queries";
import { EditTrack } from "@/components/admin/EditTrack";

export default async function NewTrackPage({ searchParams }: { searchParams: Promise<{ title?: string }> }) {
  const [{ title = "" }, collections] = await Promise.all([searchParams, getAllCollections()]);
  return <EditTrack key="new" isNew track={{
    id: "new", title, artist: "HYMNZ", collectionId: "",
    artworkUrl: null, artworkKey: null, audioUrl: null, audioKey: null,
    audioFormat: null, originalAudioKey: null, originalAudioUrl: null,
    videoUrl: null, videoKey: null, duration: 0, trackNumber: 1,
    playCount: 0, favoriteCount: 0, isActive: false, publishedAt: null,
    hasVideo: false, hasLyrics: false, youtubeUrl: null,
  }} lyrics={[]} collections={collections.map((c) => ({ id: c.id, title: c.title }))} />;
}
