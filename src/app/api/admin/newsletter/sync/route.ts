import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { NewsletterSyncError, syncAllNewsletterContacts } from "@/lib/email/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
    if (cursor && cursor.length > 128) return NextResponse.json({ error: "Invalid sync cursor" }, { status: 400 });
    const result = await syncAllNewsletterContacts(cursor);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Newsletter sync failed:", error);
    return NextResponse.json(
      { error: error instanceof NewsletterSyncError ? error.message : "Newsletter sync failed. Please retry or check the server logs." },
      { status: 500 }
    );
  }
}
