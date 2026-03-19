import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { dismissAnnouncement } from "@/lib/db/queries";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { announcementId } = body;

    if (!announcementId || typeof announcementId !== "number") {
      return NextResponse.json(
        { error: "announcementId is required and must be a number" },
        { status: 400 }
      );
    }

    await dismissAnnouncement(session.user.id, announcementId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error dismissing announcement:", error);
    return NextResponse.json(
      { error: "Failed to dismiss announcement" },
      { status: 500 }
    );
  }
}
