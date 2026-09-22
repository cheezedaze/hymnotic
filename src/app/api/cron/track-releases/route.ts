import { NextResponse } from "next/server";
import { processDueTrackReleases } from "@/lib/tracks/releases";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await processDueTrackReleases();
  return NextResponse.json({ results }, { status: results.some((result) => result.error || result.status === "attention") ? 500 : 200 });
}
