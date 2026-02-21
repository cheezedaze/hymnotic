import { NextResponse } from "next/server";
import { getCollectionWithTracks, getUserPlayCounts } from "@/lib/db/queries";
import {
  buildCollectionMediaUrls,
  buildTrackMediaUrlsWithFallback,
} from "@/lib/s3/client";
import { auth } from "@/lib/auth/auth";

/**
 * GET /api/collections/:id
 * Returns a single collection with all its tracks and resolved media URLs.
 * Includes per-user play counts when authenticated.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const { id } = await params;
    const collection = await getCollectionWithTracks(id);

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Get per-user play counts
    const userPlays = userId
      ? await getUserPlayCounts(
          userId,
          collection.tracks.map((t) => t.id)
        )
      : [];
    const userPlayMap = new Map(
      userPlays.map((p) => [p.trackId, p.playCount])
    );

    const response = {
      id: collection.id,
      title: collection.title,
      subtitle: collection.subtitle,
      description: collection.description,
      featured: collection.featured,
      ...buildCollectionMediaUrls(collection),
      tracks: collection.tracks.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        trackNumber: track.trackNumber,
        playCount: track.playCount,
        userPlayCount: userPlayMap.get(track.id) ?? 0,
        favoriteCount: track.favoriteCount,
        hasVideo: track.hasVideo,
        videoCount: track.videoCount,
        hasLyrics: track.hasLyrics,
        ...buildTrackMediaUrlsWithFallback(track, collection.artworkKey),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching collection:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}
