import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { createTrack } from "@/lib/db/queries";
import { buildTrackMediaUrls } from "@/lib/s3/client";

/**
 * POST /api/admin/tracks
 * Create a new track.
 */
export async function POST(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      id,
      collectionId,
      title,
      artist,
      audioKey,
      artworkKey,
      duration,
      trackNumber,
      hasVideo,
      videoKey,
      hasLyrics,
    } = body;

    if (!id || !collectionId || !title || duration == null || trackNumber == null) {
      return NextResponse.json(
        {
          error:
            "id, collectionId, title, duration, and trackNumber are required",
        },
        { status: 400 }
      );
    }

    const track = await createTrack({
      id,
      collectionId,
      title,
      artist: artist ?? "Hymnotic",
      audioKey: audioKey ?? undefined,
      artworkKey: artworkKey ?? undefined,
      duration,
      trackNumber,
      hasVideo: hasVideo ?? false,
      videoKey: videoKey ?? undefined,
      hasLyrics: hasLyrics ?? false,
    });

    return NextResponse.json(
      { ...track, ...buildTrackMediaUrls(track) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating track:", error);
    return NextResponse.json(
      { error: "Failed to create track" },
      { status: 500 }
    );
  }
}
