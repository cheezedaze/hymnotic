import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getTrackById, updateTrack, deleteTrack } from "@/lib/db/queries";
import { buildTrackMediaUrls } from "@/lib/s3/client";

/**
 * PATCH /api/admin/tracks/:id
 * Update an existing track.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { id } = await params;
    const body = await request.json();

    // Normalize empty strings to null for nullable fields
    if (body.youtubeUrl === "") body.youtubeUrl = null;
    if (body.videoKey === "") body.videoKey = null;
    if (body.artworkKey === "") body.artworkKey = null;
    if (body.audioKey === "") body.audioKey = null;
    if (body.originalAudioKey === "") body.originalAudioKey = null;

    const track = await updateTrack(id, body);

    if (!track) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...track, ...buildTrackMediaUrls(track) });
  } catch (error) {
    console.error("Error updating track:", error);
    return NextResponse.json(
      { error: "Failed to update track" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tracks/:id
 * Delete a track and its associated lyrics.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { id } = await params;

    const existing = await getTrackById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    await deleteTrack(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting track:", error);
    return NextResponse.json(
      { error: "Failed to delete track" },
      { status: 500 }
    );
  }
}
