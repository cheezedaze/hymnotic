import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import {
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getTrackById,
} from "@/lib/db/queries";
import { AnnouncementActionError, parseAnnouncementAction } from "@/lib/announcements/actions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (["actionType", "actionTrackId", "actionUrl", "actionLabel"].some((key) => key in body)) {
      const existing = await getAnnouncementById(parseInt(id, 10));
      if (!existing) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
      const action = parseAnnouncementAction({ ...existing, ...body });
      if (action.actionTrackId && !(await getTrackById(action.actionTrackId))?.isActive) {
        throw new AnnouncementActionError("Choose a released track.");
      }
      Object.assign(data, action);
    }
    if (body.title !== undefined) data.title = body.title;
    if (body.body !== undefined) data.body = body.body;
    if (body.publishedAt !== undefined) {
      data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    }

    const announcement = await updateAnnouncement(
      parseInt(id, 10),
      data as Parameters<typeof updateAnnouncement>[1]
    );

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(announcement);
  } catch (error) {
    if (error instanceof AnnouncementActionError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      { error: "Failed to update announcement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const existing = await getAnnouncementById(parseInt(id, 10));
    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    await deleteAnnouncement(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
