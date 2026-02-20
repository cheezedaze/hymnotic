import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getVideoById, updateVideo, deleteVideo } from "@/lib/db/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { id } = await params;
    const body = await request.json();
    const video = await updateVideo(parseInt(id, 10), body);

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(video);
  } catch (error) {
    console.error("Error updating video:", error);
    return NextResponse.json(
      { error: "Failed to update video" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { id } = await params;
    const existing = await getVideoById(parseInt(id, 10));
    if (!existing) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    await deleteVideo(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
