import { NextResponse } from "next/server";
import { getAllVideos, getTracksWithVideos } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";

export async function GET() {
  try {
    const [videoList, trackVideos] = await Promise.all([
      getAllVideos(),
      getTracksWithVideos(),
    ]);

    // Convert tracks with youtubeUrl into the same shape as standalone videos
    const trackDerivedVideos = trackVideos.map((t) => ({
      id: `track-${t.id}`,
      title: t.title,
      youtubeUrl: t.youtubeUrl!,
      thumbnailUrl: getMediaUrl(t.videoThumbnailKey),
      trackId: t.id,
      sortOrder: 9999, // sort after explicit videos
      createdAt: null,
      updatedAt: null,
    }));

    // Standalone videos first (by sortOrder), then track-derived ones
    return NextResponse.json([...videoList, ...trackDerivedVideos]);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
