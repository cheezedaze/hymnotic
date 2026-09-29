import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getTrackById: vi.fn(), getCollectionById: vi.fn(), getConsumedFreeListenTrackIds: vi.fn(), getAccessContext: vi.fn(), getSacred7TrackIds: vi.fn() }));
vi.mock("@/lib/db/queries", () => mocks);
vi.mock("@/lib/auth/access", () => ({
  getAccessContext: mocks.getAccessContext, getSacred7TrackIds: mocks.getSacred7TrackIds,
  canPlayFullTrack: (tier: string, id: string, sacred: string[], free: boolean) => tier === "paid" || (tier === "free" && (sacred.includes(id) || free)),
  getPreviewDuration: (tier: string) => tier === "visitor" ? 30 : 60,
}));
vi.mock("@/lib/s3/client", () => ({ buildTrackMediaUrlsWithFallback: () => ({ artworkUrl: null }) }));
import { GET } from "@/app/api/tracks/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getTrackById.mockResolvedValue({ id: "song", isActive: true, audioKey: "audio/tracks/song.mp3", collectionId: "album", duration: 180 });
  mocks.getCollectionById.mockResolvedValue({ artworkKey: null });
  mocks.getSacred7TrackIds.mockResolvedValue([]);
  mocks.getConsumedFreeListenTrackIds.mockResolvedValue([]);
});

describe("action track lookup access", () => {
  it.each([
    ["visitor", false, true, 30], ["free", false, false, 180],
    ["free", true, true, 60], ["paid", true, false, 180],
  ])("returns correct access for %s, consumed=%s without granting a listen", async (tier, consumed, locked, duration) => {
    mocks.getAccessContext.mockResolvedValue({ tier, userId: tier === "visitor" ? null : "user" });
    mocks.getConsumedFreeListenTrackIds.mockResolvedValue(consumed ? ["song"] : []);
    const response = await GET(new Request("http://localhost/api/tracks/song"), { params: Promise.resolve({ id: "song" }) });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ isLocked: locked, previewDuration: duration, audioUrl: "/api/tracks/song/audio" });
  });
});
