import { NextResponse } from "next/server";
import { getLyricsByTrackId } from "@/lib/db/queries";

/**
 * GET /api/tracks/:id/lyrics
 * Returns timestamped lyrics for a track.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trackLyrics = await getLyricsByTrackId(id);

    if (trackLyrics.length === 0) {
      return NextResponse.json(
        { error: "No lyrics found for this track" },
        { status: 404 }
      );
    }

    // Return as a flat array — LyricsDrawer expects Array.isArray(data)
    return NextResponse.json(
      trackLyrics.map((line) => ({
        startTime: line.startTime,
        endTime: line.endTime,
        text: line.text,
        isChorus: line.isChorus,
      }))
    );
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch lyrics" },
      { status: 500 }
    );
  }
}
