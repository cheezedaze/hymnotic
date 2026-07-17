import { NextResponse } from "next/server";
import { getTrackById } from "@/lib/db/queries";
import { signAudioUrl } from "@/lib/s3/client";

// Only tracks intentionally given away in full on a promo page.
const PROMO_TRACKS = new Set(["carry-on"]);

export async function GET(request: Request) {
  try {
    const trackId = new URL(request.url).searchParams.get("track") ?? "";
    if (!PROMO_TRACKS.has(trackId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const track = await getTrackById(trackId);
    if (!track?.audioKey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const url = signAudioUrl(track.audioKey);
    if (!url) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.redirect(url, 302);
  } catch (error) {
    console.error("Error signing promo audio:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
