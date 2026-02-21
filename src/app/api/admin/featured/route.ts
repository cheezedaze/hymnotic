import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getFeaturedContent, createFeaturedContent } from "@/lib/db/queries";

/**
 * GET /api/admin/featured
 * List all featured content.
 */
export async function GET(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const items = await getFeaturedContent();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching featured content:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured content" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/featured
 * Add new featured content.
 */
export async function POST(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { type, referenceId, position, active } = body;

    if (!type || !referenceId || position == null) {
      return NextResponse.json(
        { error: "type, referenceId, and position are required" },
        { status: 400 }
      );
    }

    const item = await createFeaturedContent({
      type,
      referenceId,
      position,
      active: active ?? true,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating featured content:", error);
    return NextResponse.json(
      { error: "Failed to create featured content" },
      { status: 500 }
    );
  }
}
