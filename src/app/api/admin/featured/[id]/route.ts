import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import {
  getFeaturedContentById,
  updateFeaturedContent,
  deleteFeaturedContent,
} from "@/lib/db/queries";

/**
 * PATCH /api/admin/featured/:id
 * Update featured content (position, active status).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const item = await updateFeaturedContent(Number(id), body);

    if (!item) {
      return NextResponse.json(
        { error: "Featured content not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating featured content:", error);
    return NextResponse.json(
      { error: "Failed to update featured content" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/featured/:id
 * Delete featured content.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const existing = await getFeaturedContentById(Number(id));
    if (!existing) {
      return NextResponse.json(
        { error: "Featured content not found" },
        { status: 404 }
      );
    }

    await deleteFeaturedContent(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting featured content:", error);
    return NextResponse.json(
      { error: "Failed to delete featured content" },
      { status: 500 }
    );
  }
}
