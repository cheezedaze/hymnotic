import { NextResponse } from "next/server";
import {
  getTracksByCollection,
  getCollectionById,
  getActiveTracks,
} from "@/lib/db/queries";
import { buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";

/**
 * GET /api/tracks?collection=sands-of-the-sea
 * Returns tracks for a collection with resolved media URLs.
 * If no collection param, returns all tracks.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collection");

    if (!collectionId) {
      // Return only active tracks with resolved media URLs
      const allTracks = await getActiveTracks();
      const collectionIds = [
        ...new Set(allTracks.map((t) => t.collectionId)),
      ];
      const collectionMap = new Map<string, string | null>();
      await Promise.all(
        collectionIds.map(async (cid) => {
          const col = await getCollectionById(cid);
          collectionMap.set(cid, col?.artworkKey ?? null);
        })
      );
      const tracksWithUrls = allTracks.map((track) => ({
        id: track.id,
        collectionId: track.collectionId,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        trackNumber: track.trackNumber,
        playCount: track.playCount,
        favoriteCount: track.favoriteCount,
        isActive: track.isActive,
        hasVideo: track.hasVideo,
        videoCount: track.videoCount,
        hasLyrics: track.hasLyrics,
        youtubeUrl: track.youtubeUrl,
        createdAt: track.createdAt,
        ...buildTrackMediaUrlsWithFallback(
          track,
          collectionMap.get(track.collectionId) ?? null
        ),
      }));
      return NextResponse.json(tracksWithUrls);
    }

    const [collectionTracks, collection] = await Promise.all([
      getTracksByCollection(collectionId),
      getCollectionById(collectionId),
    ]);

    const collectionArtworkKey = collection?.artworkKey ?? null;

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
      youtubeUrl: track.youtubeUrl,
      createdAt: track.createdAt,
      ...buildTrackMediaUrlsWithFallback(track, collectionArtworkKey),
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
