import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import {
  getCollectionById,
  updateCollection,
  deleteCollection,
} from "@/lib/db/queries";
import { buildCollectionMediaUrls } from "@/lib/s3/client";

/**
 * PATCH /api/admin/collections/:id
 * Update an existing collection.
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

    const collection = await updateCollection(id, body);

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...collection,
      ...buildCollectionMediaUrls(collection),
    });
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/collections/:id
 * Delete a collection (fails if it still has tracks).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { id } = await params;

    const existing = await getCollectionById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    await deleteCollection(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting collection:", error);

    const message =
      error instanceof Error ? error.message : "Failed to delete collection";
    const status = message.includes("Cannot delete") ? 409 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
