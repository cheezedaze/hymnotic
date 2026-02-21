import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import {
  getContentBlockById,
  updateContentBlock,
  deleteContentBlock,
} from "@/lib/db/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    // Map bodyText to body for the DB
    const data: Record<string, unknown> = { ...body };
    if (data.bodyText !== undefined) {
      data.body = data.bodyText;
      delete data.bodyText;
    }

    const block = await updateContentBlock(
      parseInt(id, 10),
      data as Parameters<typeof updateContentBlock>[1]
    );

    if (!block) {
      return NextResponse.json(
        { error: "Content block not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(block);
  } catch (error) {
    console.error("Error updating content block:", error);
    return NextResponse.json(
      { error: "Failed to update content block" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const existing = await getContentBlockById(parseInt(id, 10));
    if (!existing) {
      return NextResponse.json(
        { error: "Content block not found" },
        { status: 404 }
      );
    }

    await deleteContentBlock(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting content block:", error);
    return NextResponse.json(
      { error: "Failed to delete content block" },
      { status: 500 }
    );
  }
}
