import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getLatestPublishedAnnouncement,
  hasUserDismissed,
} from "@/lib/db/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ announcement: null });
    }

    const announcement = await getLatestPublishedAnnouncement();
    if (!announcement) {
      return NextResponse.json({ announcement: null });
    }

    const dismissed = await hasUserDismissed(session.user.id, announcement.id);
    if (dismissed) {
      return NextResponse.json({ announcement: null });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("Error fetching latest announcement:", error);
    return NextResponse.json({ announcement: null });
  }
}
