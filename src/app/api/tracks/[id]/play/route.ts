import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { incrementPlayCount, incrementUserPlayCount } from "@/lib/db/queries";

/**
 * POST /api/tracks/:id/play
 * Increments the global play count for a track and tracks per-user plays.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Increment global play count (admin dashboard uses this)
    const track = await incrementPlayCount(id);
    if (!track) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    // Track per-user play count
    const userPlay = await incrementUserPlayCount(session.user.id, id);

    return NextResponse.json({
      id: track.id,
      playCount: track.playCount,
      userPlayCount: userPlay?.playCount ?? 1,
    });
  } catch (error) {
    console.error("Error incrementing play count:", error);
    return NextResponse.json(
      { error: "Failed to update play count" },
      { status: 500 }
    );
  }
}
