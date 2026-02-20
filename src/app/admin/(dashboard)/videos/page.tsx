import { getAllVideos, getAllTracks } from "@/lib/db/queries";
import { VideosManager } from "@/components/admin/VideosManager";

export default async function AdminVideosPage() {
  const [videoList, allTracks] = await Promise.all([
    getAllVideos(),
    getAllTracks(),
  ]);

  return (
    <VideosManager
      videos={videoList}
      tracks={allTracks.map((t) => ({ id: t.id, title: t.title }))}
    />
  );
}
