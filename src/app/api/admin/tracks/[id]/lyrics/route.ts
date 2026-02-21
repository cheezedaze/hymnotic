import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { upsertLyrics, deleteLyrics } from "@/lib/db/queries";

/**
 * PUT /api/admin/tracks/:id/lyrics
 * Replace all lyrics for a track.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { lines } = body;

    if (!Array.isArray(lines)) {
      return NextResponse.json(
        { error: "lines must be an array" },
        { status: 400 }
      );
    }

    // Validate each line has the required fields
    for (const line of lines) {
      if (
        line.lineNumber == null ||
        line.startTime == null ||
        line.endTime == null ||
        !line.text
      ) {
        return NextResponse.json(
          {
            error:
              "Each line requires lineNumber, startTime, endTime, and text",
          },
          { status: 400 }
        );
      }
    }

    const result = await upsertLyrics(
      id,
      lines.map(
        (line: {
          lineNumber: number;
          startTime: number;
          endTime: number;
          text: string;
          isChorus?: boolean;
        }) => ({
          lineNumber: line.lineNumber,
          startTime: line.startTime,
          endTime: line.endTime,
          text: line.text,
          isChorus: line.isChorus ?? false,
        })
      )
    );

    return NextResponse.json({ trackId: id, lines: result });
  } catch (error) {
    console.error("Error upserting lyrics:", error);
    return NextResponse.json(
      { error: "Failed to update lyrics" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tracks/:id/lyrics
 * Delete all lyrics for a track.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await deleteLyrics(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lyrics:", error);
    return NextResponse.json(
      { error: "Failed to delete lyrics" },
      { status: 500 }
    );
  }
}
