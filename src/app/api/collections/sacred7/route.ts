import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections, sacred7Tracks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildCollectionMediaUrls } from "@/lib/s3/client";

/**
 * GET /api/collections/sacred7
 * Returns the collection designated as Sacred 7 with track count.
 * No auth required.
 */
export async function GET() {
  try {
    const result = await db
      .select()
      .from(collections)
      .where(eq(collections.isSacred7, true))
      .limit(1);

    const collection = result[0];
    if (!collection) {
      return NextResponse.json(
        { error: "No Sacred 7 collection designated" },
        { status: 404 }
      );
    }

    // Get track IDs from junction table
    const trackRows = await db
      .select({ trackId: sacred7Tracks.trackId })
      .from(sacred7Tracks);

    const mediaUrls = buildCollectionMediaUrls(collection);

    return NextResponse.json({
      id: collection.id,
      title: collection.title,
      subtitle: collection.subtitle,
      description: collection.description,
      artworkUrl: mediaUrls.artworkUrl,
      trackCount: trackRows.length,
      trackIds: trackRows.map((t) => t.trackId),
    });
  } catch (error) {
    console.error("Error fetching Sacred 7:", error);
    return NextResponse.json(
      { error: "Failed to fetch Sacred 7 collection" },
      { status: 500 }
    );
  }
}
