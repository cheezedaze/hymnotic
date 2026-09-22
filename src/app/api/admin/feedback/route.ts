import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getFeedbackPage } from "@/lib/feedback/queries";

export async function GET(request: Request) {
  if (!await requireAuthAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const page = Number(new URL(request.url).searchParams.get("page") || 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  return NextResponse.json(await getFeedbackPage(page), { headers: { "Cache-Control": "no-store" } });
}
