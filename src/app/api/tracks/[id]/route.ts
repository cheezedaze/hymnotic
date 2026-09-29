import { NextResponse } from "next/server";
import { getTrackById, getCollectionById, getConsumedFreeListenTrackIds } from "@/lib/db/queries";
import { buildTrackMediaUrlsWithFallback } from "@/lib/s3/client";
import { getAccessContext, getSacred7TrackIds, canPlayFullTrack, getPreviewDuration } from "@/lib/auth/access";

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

    if (!track?.isActive) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    const collection = await getCollectionById(track.collectionId);
    const access = await getAccessContext();
    const sacred7TrackIds = await getSacred7TrackIds();
    const consumed = access.tier === "free" && access.userId
      ? await getConsumedFreeListenTrackIds(access.userId, [id]) : [];
    const isFreeListen = access.tier === "free" && !sacred7TrackIds.includes(id) && !consumed.includes(id);
    const isFull = canPlayFullTrack(access.tier, id, sacred7TrackIds, isFreeListen);

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
      isActive: track.isActive,
      youtubeUrl: track.youtubeUrl,
      isLocked: !isFull,
      previewDuration: isFull ? track.duration : getPreviewDuration(access.tier),
      isFreeListen,
      isSacred7: sacred7TrackIds.includes(id),
      ...buildTrackMediaUrlsWithFallback(track, collection?.artworkKey ?? null),
      audioUrl: track.audioKey ? `/api/tracks/${track.id}/audio` : null,
    };

    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Error fetching track:", error);
    return NextResponse.json(
      { error: "Failed to fetch track" },
      { status: 500 }
    );
  }
}
