import { NextResponse } from "next/server";
import { getTrackById, grantFreeListen } from "@/lib/db/queries";
import { signAudioUrl, getObjectRange } from "@/lib/s3/client";
import {
  getAccessContext,
  getSacred7TrackIds,
  canPlayFullTrack,
  getPreviewDuration,
} from "@/lib/auth/access";

// Hard cap on how much audio a non-paying tier can pull, independent of the
// client-side 30/60s cutoff. MP3 frames are self-contained from the start, so
// a byte-prefix is playable. The cap is sized from the track's real duration;
// a small margin keeps the client-side cutoff (not the byte cap) the UX edge.
const PREVIEW_MARGIN_SEC = 10;
// Ceiling on bytes fetched/served per request (~70s at 320 kbps), and the
// fallback cap when a track has no known duration.
const MAX_FETCH_BYTES = 3_000_000;

/**
 * GET /api/tracks/:id/audio
 * Tier-gated audio delivery. Entitled listeners are redirected to the full CDN
 * file; everyone else gets a byte-capped MP3 preview streamed from S3, so the
 * full track is never handed to a tier that isn't allowed to hear it.
 *
 * NOTE: this closes the "full URL in the API response" leak. The CDN object is
 * still public at a guessable path — closing that requires making audio private
 * + signed (see the AWS fast-follow doc).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const track = await getTrackById(id);
    if (!track?.audioKey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const access = await getAccessContext();
    const sacred7 = await getSacred7TrackIds();
    const baseFull = canPlayFullTrack(access.tier, id, sacred7); // paid or free+Sacred 7

    // Paid / Sacred 7 → full, no consumption.
    if (baseFull) {
      const url = signAudioUrl(track.audioKey);
      if (!url) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.redirect(url, 302);
    }

    // Free user, non-Sacred-7 → grant their one free listen. Sign first so a
    // signing failure doesn't burn the listen, then grant: grantFreeListen
    // consumes it on the first play and keeps returning full for the rest of the
    // same session (seeks / range re-requests / iOS probes), then locks to
    // preview. A denied grant falls through to the preview path below.
    if (access.tier === "free" && access.userId && !sacred7.includes(id)) {
      const url = signAudioUrl(track.audioKey);
      if (url && (await grantFreeListen(access.userId, id))) {
        return NextResponse.redirect(url, 302);
      }
    }

    // Preview → serve at most `cap` bytes from the start of the file.
    const previewSec = getPreviewDuration(access.tier); // 30 (visitor) or 60 (free)
    // Where the client wants to start reading (iOS <audio> requires Range).
    const rangeHeader = request.headers.get("range");
    let start = 0;
    if (rangeHeader) {
      const m = /bytes=(\d+)-/.exec(rangeHeader);
      if (m) start = parseInt(m[1], 10);
    }
    if (start < 0 || !Number.isFinite(start)) start = 0;

    // Pull a bounded chunk; learn the true file size from Content-Range.
    const { bytes: fetched, total } = await getObjectRange(
      track.audioKey,
      start,
      start + MAX_FETCH_BYTES - 1
    );

    // Precise cap: serve only the first (previewSec + margin) worth of the
    // file, using the track's real duration so low-bitrate files don't leak
    // extra. Falls back to a fixed ceiling if duration is unknown.
    const capBytes =
      track.duration && track.duration > 0
        ? Math.min(
            total,
            Math.ceil(
              (total * (previewSec + PREVIEW_MARGIN_SEC)) / track.duration
            )
          )
        : Math.min(total, MAX_FETCH_BYTES);

    if (start >= capBytes) {
      // Seek past the preview window — nothing there.
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${capBytes}` },
      });
    }

    // Never serve past the cap, even if we fetched more.
    const allowed = Math.min(fetched.length, capBytes - start);
    const body = fetched.subarray(0, allowed);

    const headers: Record<string, string> = {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(body.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    };
    if (rangeHeader) {
      // Report the capped length as the total so the client never seeks past it.
      headers["Content-Range"] = `bytes ${start}-${
        start + body.length - 1
      }/${capBytes}`;
    }

    return new NextResponse(body, {
      status: rangeHeader ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("Error serving track audio:", error);
    return NextResponse.json({ error: "Failed to load audio" }, { status: 500 });
  }
}
