import { NextResponse } from "next/server";
import { getTracksByIds, getCollectionById } from "@/lib/db/queries";
import { buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";

/**
 * POST /api/tracks/batch
 * Body: { ids: string[] }
 * Returns an array of tracks with resolved media URLs.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    // Cap at 100 to prevent abuse
    const limitedIds = ids.slice(0, 100);
    const rawTracks = await getTracksByIds(limitedIds);

    // Gather unique collection IDs and fetch their artwork keys
    const collectionIds = [...new Set(rawTracks.map((t) => t.collectionId))];
    const collectionMap = new Map<string, string | null>();
    await Promise.all(
      collectionIds.map(async (cid) => {
        const col = await getCollectionById(cid);
        collectionMap.set(cid, col?.artworkKey ?? null);
      })
    );

    const tracksWithUrls = rawTracks.map((track) => ({
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
      ...buildTrackMediaUrlsWithFallback(
        track,
        collectionMap.get(track.collectionId) ?? null
      ),
    }));

    return NextResponse.json(tracksWithUrls);
  } catch (error) {
    console.error("Error fetching batch tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 }
    );
  }
}
