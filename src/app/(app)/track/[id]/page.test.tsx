import { beforeEach, describe, expect, it, vi } from "vitest";

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
  useRouter: vi.fn(),
}));

import TrackPage, { generateMetadata } from "./page";

const now = new Date("2026-08-13T12:00:00.000Z");
const activeTrack = {
  id: "carry-on",
  collectionId: "all-tracks",
  title: "Carry On",
  artist: "HYMNZ",
  artworkKey: "images/artwork/carry-on.jpg",
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
  artworkKey: "images/artwork/all-tracks.jpg",
  featured: false,
  isSacred7: false,
  sortOrder: 0,
  publishedAt: now,
  createdAt: now,
  updatedAt: now,
};

describe("track page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTrackById.mockResolvedValue(activeTrack);
    getCollectionById.mockResolvedValue(collection);
    getMediaUrl.mockImplementation((key: string | null | undefined) =>
      key ? `https://media.hymnz.test/${key}` : null
    );
  });

  it("uses the canonical track URL and generated share image in metadata", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ id: "carry-on" }) })
    ).resolves.toMatchObject({
      openGraph: {
        url: "https://www.hymnz.com/track/carry-on",
        images: [
          {
            url: "https://www.hymnz.com/track/carry-on/opengraph-image",
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: {
        images: [
          {
            url: "https://www.hymnz.com/track/carry-on/opengraph-image",
            width: 1200,
            height: 630,
          },
        ],
      },
    });
  });

  it("rejects inactive tracks from the public page", async () => {
    getTrackById.mockResolvedValue({ ...activeTrack, isActive: false });

    await expect(
      TrackPage({ params: Promise.resolve({ id: "hidden-track" }) })
    ).rejects.toThrow("NOT_FOUND");
  });

  it("treats a missing collection record as unusable", async () => {
    getTrackById.mockResolvedValue({
      ...activeTrack,
      collectionId: "missing-collection",
      artworkKey: null,
    });
    getCollectionById.mockResolvedValue(null);

    const page = await TrackPage({
      params: Promise.resolve({ id: "carry-on" }),
    });

    expect(page.props).toMatchObject({
      artworkUrl: null,
      collectionId: null,
      collectionTitle: null,
    });
  });

  it("returns not-found metadata for inactive tracks", async () => {
    getTrackById.mockResolvedValue({ ...activeTrack, isActive: false });

    await expect(
      generateMetadata({ params: Promise.resolve({ id: "hidden-track" }) })
    ).resolves.toEqual({ title: "Track Not Found | HYMNZ" });
  });
});
