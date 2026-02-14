import { NextResponse } from "next/server";
import { getAllCollections } from "@/lib/db/queries";
import { buildCollectionMediaUrls } from "@/lib/s3/client";

/**
 * GET /api/collections
 * Returns all collections with resolved media URLs.
 */
export async function GET() {
  try {
    const allCollections = await getAllCollections();

    const collectionsWithUrls = allCollections.map((collection) => ({
      id: collection.id,
      title: collection.title,
      subtitle: collection.subtitle,
      description: collection.description,
      featured: collection.featured,
      sortOrder: collection.sortOrder,
      ...buildCollectionMediaUrls(collection),
      publishedAt: collection.publishedAt,
    }));

    return NextResponse.json(collectionsWithUrls);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
