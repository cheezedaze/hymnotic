import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getAllAds, createAd } from "@/lib/db/queries";

export async function GET(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const adsList = await getAllAds();
    return NextResponse.json(adsList);
  } catch (error) {
    console.error("Error fetching ads:", error);
    return NextResponse.json(
      { error: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, imageKey, linkUrl, active, sortOrder } = body;

    if (!title || !imageKey) {
      return NextResponse.json(
        { error: "title and imageKey are required" },
        { status: 400 }
      );
    }

    const ad = await createAd({
      title,
      imageKey,
      linkUrl: linkUrl ?? undefined,
      active: active ?? true,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json(ad, { status: 201 });
  } catch (error) {
    console.error("Error creating ad:", error);
    return NextResponse.json(
      { error: "Failed to create ad" },
      { status: 500 }
    );
  }
}
