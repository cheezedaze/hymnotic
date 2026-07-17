import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/auth/access";
import { incrementPlayCount, recordPlayEvent } from "@/lib/db/queries";

// Only tracks/sources featured on promo pages may be recorded here.
const PROMO_TRACKS = new Set(["carry-on"]);
const PROMO_SOURCES = new Set(["another-testament"]);

export async function POST(request: Request) {
  try {
    const { trackId, source } = await request.json();
    if (!PROMO_TRACKS.has(trackId) || !PROMO_SOURCES.has(source)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const access = await getAccessContext();
    await incrementPlayCount(trackId);
    await recordPlayEvent(access.userId, trackId, source);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording promo play:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
