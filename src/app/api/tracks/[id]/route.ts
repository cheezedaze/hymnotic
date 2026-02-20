import { NextResponse } from "next/server";
import { getTrackById, getCollectionById } from "@/lib/db/queries";
import { buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";

/**
 * GET /api/tracks/:id
 * Returns a single track with resolved media URLs.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const track = await getTrackById(id);

    if (!track) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    const collection = await getCollectionById(track.collectionId);

    const response = {
      id: track.id,
      collectionId: track.collectionId,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      trackNumber: track.trackNumber,
      playCount: track.playCount,
      favoriteCount: track.favoriteCount,
      hasVideo: track.hasVideo,
      videoCount: track.videoCount,
      hasLyrics: track.hasLyrics,
      ...buildTrackMediaUrlsWithFallback(track, collection?.artworkKey ?? null),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching track:", error);
    return NextResponse.json(
      { error: "Failed to fetch track" },
      { status: 500 }
    );
  }
}
