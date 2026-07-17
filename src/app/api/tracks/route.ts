import { NextResponse } from "next/server";
import {
  getTracksByCollection,
  getCollectionById,
  getActiveTracks,
  getConsumedFreeListenTrackIds,
  getUserPlayCounts,
} from "@/lib/db/queries";
import { buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";
import {
  getAccessContext,
  getSacred7TrackIds,
  canPlayFullTrack,
  getPreviewDuration,
} from "@/lib/auth/access";

/**
 * GET /api/tracks?collection=sands-of-the-sea
 * Returns tracks for a collection with resolved media URLs.
 * If no collection param, returns all tracks.
 * Includes per-user play counts when authenticated.
 */
export async function GET(request: Request) {
  try {
    const access = await getAccessContext();
    const userId = access.userId;
    const sacred7TrackIds = await getSacred7TrackIds();
    const previewDuration = getPreviewDuration(access.tier);

    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collection");

    if (!collectionId) {
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

      // Get per-user play counts
      const userPlays = userId
        ? await getUserPlayCounts(
            userId,
            allTracks.map((t) => t.id)
          )
        : [];
      const userPlayMap = new Map(
        userPlays.map((p) => [p.trackId, p.playCount])
      );

      const consumed =
        access.tier === "free" && userId
          ? new Set(
              await getConsumedFreeListenTrackIds(
                userId,
                allTracks.map((t) => t.id)
              )
            )
          : new Set<string>();

      const tracksWithUrls = allTracks.map((track) => {
        const freeListenAvailable =
          access.tier === "free" &&
          !sacred7TrackIds.includes(track.id) &&
          !consumed.has(track.id);
        const isFull = canPlayFullTrack(
          access.tier,
          track.id,
          sacred7TrackIds,
          freeListenAvailable
        );
        return {
          id: track.id,
          collectionId: track.collectionId,
          title: track.title,
          artist: track.artist,
          duration: track.duration,
          trackNumber: track.trackNumber,
          playCount: track.playCount,
          userPlayCount: userPlayMap.get(track.id) ?? 0,
          favoriteCount: track.favoriteCount,
          isActive: track.isActive,
          hasVideo: track.hasVideo,
          videoCount: track.videoCount,
          hasLyrics: track.hasLyrics,
          youtubeUrl: track.youtubeUrl,
          createdAt: track.createdAt,
          isLocked: !isFull,
          previewDuration: isFull ? track.duration : previewDuration,
          isFreeListen: freeListenAvailable,
          isSacred7: sacred7TrackIds.includes(track.id),
          ...buildTrackMediaUrlsWithFallback(
            track,
            collectionMap.get(track.collectionId) ?? null
          ),
          audioUrl: track.audioKey ? `/api/tracks/${track.id}/audio` : null,
          originalAudioUrl: null,
        };
      });
      return NextResponse.json(tracksWithUrls);
    }

    const [collectionTracks, collection] = await Promise.all([
      getTracksByCollection(collectionId),
      getCollectionById(collectionId),
    ]);

    const collectionArtworkKey = collection?.artworkKey ?? null;

    // Get per-user play counts
    const userPlays = userId
      ? await getUserPlayCounts(
          userId,
          collectionTracks.map((t) => t.id)
        )
      : [];
    const userPlayMap = new Map(
      userPlays.map((p) => [p.trackId, p.playCount])
    );

    const consumedC =
      access.tier === "free" && userId
        ? new Set(
            await getConsumedFreeListenTrackIds(
              userId,
              collectionTracks.map((t) => t.id)
            )
          )
        : new Set<string>();

    const tracksWithUrls = collectionTracks.map((track) => {
      const freeListenAvailable =
        access.tier === "free" &&
        !sacred7TrackIds.includes(track.id) &&
        !consumedC.has(track.id);
      const isFull = canPlayFullTrack(
        access.tier,
        track.id,
        sacred7TrackIds,
        freeListenAvailable
      );
      return {
        id: track.id,
        collectionId: track.collectionId,
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
        youtubeUrl: track.youtubeUrl,
        createdAt: track.createdAt,
        isLocked: !isFull,
        previewDuration: isFull ? track.duration : previewDuration,
        isFreeListen: freeListenAvailable,
        isSacred7: sacred7TrackIds.includes(track.id),
        ...buildTrackMediaUrlsWithFallback(track, collectionArtworkKey),
        audioUrl: track.audioKey ? `/api/tracks/${track.id}/audio` : null,
        originalAudioUrl: null,
      };
    });

    return NextResponse.json(tracksWithUrls);
  } catch (error) {
    console.error("Error fetching tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 }
    );
  }
}
