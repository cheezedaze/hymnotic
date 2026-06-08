import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { syncAllNewsletterContacts } from "@/lib/email/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireAuthAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllNewsletterContacts();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Newsletter sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", detail: String(error) },
      { status: 500 }
    );
  }
}
