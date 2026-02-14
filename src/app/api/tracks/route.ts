import { NextResponse } from "next/server";
import { getTracksByCollection } from "@/lib/db/queries";
import { buildTrackMediaUrls } from "@/lib/s3/client";

/**
 * GET /api/tracks?collection=sands-of-the-sea
 * Returns tracks for a collection with resolved media URLs.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collection");

    if (!collectionId) {
      return NextResponse.json(
        { error: "collection query parameter is required" },
        { status: 400 }
      );
    }

    const collectionTracks = await getTracksByCollection(collectionId);

    const tracksWithUrls = collectionTracks.map((track) => ({
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
      ...buildTrackMediaUrls(track),
    }));

    return NextResponse.json(tracksWithUrls);
  } catch (error) {
    console.error("Error fetching tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 }
    );
  }
}
