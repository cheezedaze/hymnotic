import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getSacred7Selections, setSacred7Tracks, getTracksByIds } from "@/lib/db/queries";

/**
 * GET /api/admin/sacred7/tracks
 * Return the current Sacred 7 track IDs.
 */
export async function GET() {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const selections = await getSacred7Selections();
  return NextResponse.json({
    trackIds: selections.map((s) => s.trackId),
  });
}

/**
 * PUT /api/admin/sacred7/tracks
 * Replace Sacred 7 track selections. Max 7 tracks.
 */
export async function PUT(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { trackIds } = body;

    if (!Array.isArray(trackIds)) {
      return NextResponse.json({ error: "trackIds must be an array" }, { status: 400 });
    }

    if (trackIds.length > 7) {
      return NextResponse.json({ error: "Maximum 7 tracks allowed" }, { status: 400 });
    }

    // Validate all track IDs exist
    if (trackIds.length > 0) {
      const existing = await getTracksByIds(trackIds);
      const existingIds = new Set(existing.map((t) => t.id));
      const missing = trackIds.filter((id: string) => !existingIds.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Tracks not found: ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    }

    await setSacred7Tracks(trackIds);

    return NextResponse.json({ trackIds });
  } catch (error) {
    console.error("Error updating Sacred 7 tracks:", error);
    return NextResponse.json(
      { error: "Failed to update Sacred 7 tracks" },
      { status: 500 }
    );
  }
}
