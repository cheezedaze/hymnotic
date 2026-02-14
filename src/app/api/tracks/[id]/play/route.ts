import { NextResponse } from "next/server";
import { incrementPlayCount } from "@/lib/db/queries";

/**
 * POST /api/tracks/:id/play
 * Increments the play count for a track.
 * Called by the audio player when a track starts playing.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const track = await incrementPlayCount(id);

    if (!track) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: track.id,
      playCount: track.playCount,
    });
  } catch (error) {
    console.error("Error incrementing play count:", error);
    return NextResponse.json(
      { error: "Failed to update play count" },
      { status: 500 }
    );
  }
}
