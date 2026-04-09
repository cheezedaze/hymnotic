import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getAllBannerAds, createBannerAd } from "@/lib/db/queries";

export async function GET(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const banners = await getAllBannerAds();
    return NextResponse.json(banners);
  } catch (error) {
    console.error("Error fetching banner ads:", error);
    return NextResponse.json(
      { error: "Failed to fetch banner ads" },
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

    const banner = await createBannerAd({
      title,
      imageKey,
      linkUrl: linkUrl ?? undefined,
      active: active ?? true,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error("Error creating banner ad:", error);
    return NextResponse.json(
      { error: "Failed to create banner ad" },
      { status: 500 }
    );
  }
}
