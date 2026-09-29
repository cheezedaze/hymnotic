import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
const mocks = vi.hoisted(() => ({ getPublicTrack: vi.fn() }));
vi.mock("@/lib/tracks/public-track", () => mocks);
import { GET } from "@/app/(app)/track/[id]/opengraph-image/route";

const context = { params: Promise.resolve({ id: "song" }) };
const request = new Request("http://localhost/track/song/opengraph-image");
beforeEach(() => mocks.getPublicTrack.mockResolvedValue({ title: "A song to share", artist: "HYMNZ", artworkUrl: null }));
afterEach(() => vi.unstubAllGlobals());
async function expectPng() {
  const response = await GET(request, context);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/png");
  const bytes = Buffer.from(await response.arrayBuffer());
  expect(bytes.toString("ascii", 1, 4)).toBe("PNG");
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
}

describe("branded social image", () => {
  it("renders a 1200×630 branded fallback without artwork", expectPng);
  it("renders artwork and survives a failed or corrupt artwork response", async () => {
    mocks.getPublicTrack.mockResolvedValue({ title: "Song", artist: "HYMNZ", artworkUrl: "https://cdn.example/art.png" });
    const bytes = await readFile("public/images/hymnz-logo1.png");
    const fetch = vi.fn().mockResolvedValue(new Response(bytes, { headers: { "content-type": "image/png" } }));
    vi.stubGlobal("fetch", fetch);
    await expectPng();
    fetch.mockRejectedValue(new Error("Artwork unavailable"));
    await expectPng();
    fetch.mockResolvedValue(new Response("not an image", { headers: { "content-type": "image/png" } }));
    await expectPng();
  });
  it("does not expose inactive/missing track images", async () => {
    mocks.getPublicTrack.mockResolvedValue(null);
    expect((await GET(request, context)).status).toBe(404);
  });
});
