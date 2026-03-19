import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getAllAnnouncements, createAnnouncement } from "@/lib/db/queries";

export async function GET() {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const items = await getAllAnnouncements();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, body: bodyHtml, publishedAt } = body;

    if (!title || !bodyHtml) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    const announcement = await createAnnouncement({
      title,
      body: bodyHtml,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}
