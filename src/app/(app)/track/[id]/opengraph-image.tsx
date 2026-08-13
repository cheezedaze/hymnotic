import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getCollectionById, getTrackById } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";

export const runtime = "nodejs";
export const alt = "Listen to this track on HYMNZ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface TrackOpenGraphImageProps {
  params: Promise<{ id: string }>;
}

async function toDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return null;
    const mime = response.headers.get("content-type") || "image/jpeg";
    const data = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${mime};base64,${data}`;
  } catch {
    return null;
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

  return new ImageResponse(
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
          {artworkSrc ? (
            <img
              src={artworkSrc}
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
}
