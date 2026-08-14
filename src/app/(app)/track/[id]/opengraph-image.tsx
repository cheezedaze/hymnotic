import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import sharp from "sharp";
import { getCollectionById, getTrackById } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";

export const runtime = "nodejs";
export const alt = "Listen to this track on HYMNZ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface TrackOpenGraphImageProps {
  params: Promise<{ id: string }>;
}

const ARTWORK_FETCH_TIMEOUT_MS = 5_000;
const MAX_ARTWORK_BYTES = 5_000_000;
const ALLOWED_ARTWORK_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function readBoundedBody(response: Response): Promise<Buffer | null> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (!Number.isFinite(declaredBytes) || declaredBytes > MAX_ARTWORK_BYTES) {
      return null;
    }
  }

  const reader = response.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_ARTWORK_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, totalBytes);
}

async function toDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ARTWORK_FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      cache: "force-cache",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!contentType || !ALLOWED_ARTWORK_TYPES.has(contentType)) return null;

    const body = await readBoundedBody(response);
    if (!body) return null;
    const png = await sharp(body, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize(630, 630, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function TrackOpenGraphImage({
  params,
}: TrackOpenGraphImageProps) {
  const { id } = await params;
  const track = await getTrackById(id);

  if (!track || !track.isActive) {
    notFound();
  }

  const collection = track.collectionId
    ? await getCollectionById(track.collectionId)
    : null;
  const artworkUrl =
    getMediaUrl(track.artworkKey) ||
    getMediaUrl(collection?.artworkKey) ||
    null;
  const artworkSrc = await toDataUrl(artworkUrl);
  const logo = await readFile(
    join(process.cwd(), "public/images/hymnz-logo2.png")
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const artist = track.artist || "HYMNZ";

  const renderImage = (resolvedArtworkSrc: string | null) => new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 64,
          background:
            "linear-gradient(135deg, #081722 0%, #102b3b 62%, #173746 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            gap: 58,
            padding: 40,
            border: "2px solid rgba(123, 222, 235, 0.28)",
            borderRadius: 34,
            background: "rgba(4, 17, 26, 0.74)",
            overflow: "hidden",
          }}
        >
          {resolvedArtworkSrc ? (
            <img
              src={resolvedArtworkSrc}
              alt=""
              width="315"
              height="315"
              style={{
                width: 315,
                height: 315,
                borderRadius: 26,
                objectFit: "cover",
                boxShadow: "0 22px 55px rgba(0, 0, 0, 0.4)",
              }}
            />
          ) : (
            <div
              style={{
                width: 315,
                height: 315,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 26,
                background:
                  "linear-gradient(145deg, #29d3e2 0%, #167b91 55%, #d5a83f 100%)",
                boxShadow: "0 22px 55px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 176,
                  height: 176,
                  border: "5px solid rgba(255, 255, 255, 0.82)",
                  borderRadius: 88,
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 82,
                  fontWeight: 700,
                }}
              >
                H
              </div>
            </div>
          )}

          <div
            style={{
              minWidth: 0,
              height: 315,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                maxHeight: 133.4,
                fontSize: 58,
                lineHeight: 1.15,
                fontWeight: 700,
                letterSpacing: -1.5,
                overflow: "hidden",
              }}
            >
              {track.title}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 30,
                lineHeight: 1.2,
                color: "#9eeaf1",
                overflow: "hidden",
              }}
            >
              {artist}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "auto",
                gap: 18,
                overflow: "hidden",
              }}
            >
              <img
                src={logoSrc}
                alt="HYMNZ"
                style={{ width: 150, height: 102, objectFit: "contain" }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 25,
                  color: "#f3d58a",
                  whiteSpace: "nowrap",
                }}
              >
                Listen on HYMNZ
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );

  if (!artworkSrc) return renderImage(null);

  try {
    const response = renderImage(artworkSrc);
    const png = await response.arrayBuffer();
    return new Response(png, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return renderImage(null);
  }
}
