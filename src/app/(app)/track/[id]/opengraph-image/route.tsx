import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPublicTrack } from "@/lib/tracks/public-track";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const track = await getPublicTrack((await params).id);
  if (!track) return new Response("Track not found", { status: 404 });
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/images/hymnz-logo1.png"))).toString("base64")}`;
  let artwork: string | null = null;
  if (track.artworkUrl) {
    try {
      const response = await fetch(track.artworkUrl, { signal: AbortSignal.timeout(4000) });
      const type = response.headers.get("content-type")?.split(";")[0];
      if (response.ok && type && ["image/png", "image/jpeg", "image/webp"].includes(type)) {
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength <= 6_000_000) artwork = `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
      }
    } catch { /* The branded fallback must still be shareable when artwork is unavailable. */ }
  }

  const render = (image: string | null) => new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#141A24", color: "#F1F4FA", padding: 60, gap: 48, alignItems: "center" }}>
      <div style={{ display: "flex", width: 440, height: 440, borderRadius: 28, overflow: "hidden", background: "#20313B", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {image ? <img src={image} width={440} height={440} style={{ objectFit: "cover" }} alt="" />
          : <img src={logo} width={260} height={179} alt="HYMNZ" />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, height: 450, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#00FFFB", fontSize: 30, letterSpacing: 5 }}>
          <img src={logo} width={64} height={44} alt="" />HYMNZ
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: track.title.length > 50 ? 46 : 62, fontWeight: 700, lineHeight: 1.12, overflow: "hidden", maxHeight: 285 }}>{track.title.slice(0, 120)}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#A9B6C9" }}>{track.artist.slice(0, 50)}</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#00FFFB" }}>Listen on HYMNZ · hymnz.com</div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );

  let image: ArrayBuffer;
  try { image = await render(artwork).arrayBuffer(); }
  catch { image = await render(null).arrayBuffer(); }
  return new Response(image, { headers: {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  } });
}
