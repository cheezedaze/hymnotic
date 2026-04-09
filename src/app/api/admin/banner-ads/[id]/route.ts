import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getBannerAdById, updateBannerAd, deleteBannerAd } from "@/lib/db/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const banner = await updateBannerAd(parseInt(id, 10), body);

    if (!banner) {
      return NextResponse.json(
        { error: "Banner ad not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(banner);
  } catch (error) {
    console.error("Error updating banner ad:", error);
    return NextResponse.json(
      { error: "Failed to update banner ad" },
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
    const existing = await getBannerAdById(parseInt(id, 10));
    if (!existing) {
      return NextResponse.json(
        { error: "Banner ad not found" },
        { status: 404 }
      );
    }

    await deleteBannerAd(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting banner ad:", error);
    return NextResponse.json(
      { error: "Failed to delete banner ad" },
      { status: 500 }
    );
  }
}
