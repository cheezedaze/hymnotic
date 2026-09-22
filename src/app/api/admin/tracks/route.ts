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
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || typeof body.collectionId !== "string" || !body.collectionId) {
      return NextResponse.json({ error: "Title and collection are required" }, { status: 400 });
    }
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "track";
    const track = await createTrack({
      id: `${slug}-${crypto.randomUUID().slice(0, 8)}`,
      collectionId: body.collectionId,
      title,
      artist: body.artist || "HYMNZ",
      audioKey: body.audioKey || undefined,
      audioFormat: body.audioFormat || undefined,
      originalAudioKey: body.originalAudioKey || undefined,
      artworkKey: body.artworkKey || undefined,
      duration: typeof body.duration === "number" && Number.isFinite(body.duration) ? Math.max(0, body.duration) : 0,
      trackNumber: 1,
      isActive: false,
      videoKey: body.videoKey || undefined,
      hasVideo: !!body.videoKey,
      youtubeUrl: body.youtubeUrl || undefined,
    });

    return NextResponse.json(
      { ...track, ...buildTrackMediaUrls(track), audioUrl: track.audioKey ? `/api/tracks/${track.id}/audio` : null },
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
