import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { createCollection } from "@/lib/db/queries";
import { buildCollectionMediaUrls } from "@/lib/s3/client";

/**
 * POST /api/admin/collections
 * Create a new collection.
 */
export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { id, title, subtitle, description, artworkKey, featured, sortOrder } =
      body;

    if (!id || !title) {
      return NextResponse.json(
        { error: "id and title are required" },
        { status: 400 }
      );
    }

    const collection = await createCollection({
      id,
      title,
      subtitle: subtitle ?? undefined,
      description: description ?? undefined,
      artworkKey: artworkKey ?? undefined,
      featured: featured ?? false,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json(
      { ...collection, ...buildCollectionMediaUrls(collection) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
