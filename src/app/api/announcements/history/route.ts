import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getPublishedAnnouncements,
  getUserDismissedAnnouncementIds,
} from "@/lib/db/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [items, dismissedIds] = await Promise.all([
      getPublishedAnnouncements(),
      getUserDismissedAnnouncementIds(session.user.id),
    ]);

    return NextResponse.json({ announcements: items, dismissedIds });
  } catch (error) {
    console.error("Error fetching announcement history:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcement history" },
      { status: 500 }
    );
  }
}
