import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrackOpenGraphImage, {
  contentType,
  size,
} from "./opengraph-image";

const { getTrackById, getCollectionById, getMediaUrl } = vi.hoisted(() => ({
  getTrackById: vi.fn(),
  getCollectionById: vi.fn(),
  getMediaUrl: vi.fn(),
}));

vi.mock("@/lib/db/queries", () => ({
  getTrackById,
  getCollectionById,
}));
vi.mock("@/lib/s3/client", () => ({ getMediaUrl }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const now = new Date("2026-08-13T12:00:00.000Z");
const activeTrack = {
  id: "carry-on",
  collectionId: "all-tracks",
  title: "Carry On",
  artist: "HYMNZ",
  artworkKey: null,
  audioKey: "audio/tracks/carry-on.mp3",
  audioFormat: "mp3",
  originalAudioKey: null,
  duration: 210,
  trackNumber: 1,
  playCount: 10,
  favoriteCount: 4,
  isActive: true,
  hasVideo: false,
  videoKey: null,
  videoThumbnailKey: null,
  videoCount: 0,
  hasLyrics: false,
  youtubeUrl: null,
  publishedAt: now,
  createdAt: now,
  updatedAt: now,
};
const collection = {
  id: "all-tracks",
  title: "All Tracks",
  subtitle: null,
  description: null,
  artworkKey: null,
  featured: false,
  isSacred7: false,
  sortOrder: 0,
  publishedAt: now,
  createdAt: now,
  updatedAt: now,
};

describe("track Open Graph image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTrackById.mockResolvedValue(activeTrack);
    getCollectionById.mockResolvedValue(collection);
    getMediaUrl.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a non-empty 1200x630 PNG without artwork", async () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
    const response = await TrackOpenGraphImage({
      params: Promise.resolve({ id: "carry-on" }),
    });
    expect(response.headers.get("content-type")).toContain("image/png");
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect(png.byteLength).toBeGreaterThan(1000);
  });

  it.each([
    ["missing", null],
    ["inactive", { ...activeTrack, isActive: false }],
  ])("treats a %s track as not found", async (_state, track) => {
    getTrackById.mockResolvedValue(track);

    await expect(
      TrackOpenGraphImage({
        params: Promise.resolve({ id: "unavailable-track" }),
      })
    ).rejects.toThrow("NOT_FOUND");
  });

  it("renders the branded fallback when remote artwork fetching fails", async () => {
    getTrackById.mockResolvedValue({
      ...activeTrack,
      artworkKey: "images/artwork/carry-on.jpg",
    });
    getMediaUrl.mockReturnValue(
      "https://media.hymnz.test/images/artwork/carry-on.jpg"
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const response = await TrackOpenGraphImage({
      params: Promise.resolve({ id: "carry-on" }),
    });

    expect(response.headers.get("content-type")).toContain("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });
});
