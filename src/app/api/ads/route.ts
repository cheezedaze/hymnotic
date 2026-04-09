import { NextResponse } from "next/server";
import { getActiveAds } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";

export async function GET() {
  try {
    const adsList = await getActiveAds();
    const result = adsList.map((ad) => ({
      id: ad.id,
      title: ad.title,
      imageUrl: getMediaUrl(ad.imageKey),
      linkUrl: ad.linkUrl,
    }));

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching active ads:", error);
    return NextResponse.json(
      { error: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}
