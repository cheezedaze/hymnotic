import { NextResponse } from "next/server";
import { getAnnouncementHistory } from "@/lib/db/queries";

export async function GET(request: Request) {
  try {
    const rawCursor = new URL(request.url).searchParams.get("cursor");
    const cursor = rawCursor === null ? undefined : Number(rawCursor);
    if (cursor !== undefined && (!Number.isSafeInteger(cursor) || cursor <= 0)) return NextResponse.json({ error: "Invalid history cursor" }, { status: 400 });
    const result = await getAnnouncementHistory(cursor);
    if (!result) return NextResponse.json({ error: "This update is no longer available. Refresh the history." }, { status: 400 });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error fetching announcement history:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcement history" },
      { status: 500 }
    );
  }
}
