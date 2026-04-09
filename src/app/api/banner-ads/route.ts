import { NextResponse } from "next/server";
import { getActiveBannerAds } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";

export async function GET() {
  try {
    const banners = await getActiveBannerAds();
    const result = banners.map((b) => ({
      id: b.id,
      title: b.title,
      imageUrl: getMediaUrl(b.imageKey),
      linkUrl: b.linkUrl,
    }));

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching active banner ads:", error);
    return NextResponse.json(
      { error: "Failed to fetch banner ads" },
      { status: 500 }
    );
  }
}
