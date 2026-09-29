import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getTrackById: vi.fn(), getCollectionById: vi.fn() }));
vi.mock("@/lib/db/queries", () => mocks);
vi.mock("@/lib/s3/client", () => ({ getMediaUrl: (key: string | null) => key ? `https://cdn.example/${key}` : null }));
import { getPublicTrack } from "./public-track";
import { generateMetadata } from "@/app/(app)/track/[id]/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getTrackById.mockResolvedValue({ id: "song", title: "Song", artist: "Artist", collectionId: "album", artworkKey: "track.png", isActive: true });
  mocks.getCollectionById.mockResolvedValue({ id: "album", title: "Album", artworkKey: "album.png" });
});

describe("public track display", () => {
  it("prefers track artwork, falls back to collection artwork, and exposes no playback URL", async () => {
    expect(await getPublicTrack("song")).toEqual({ trackId: "song", title: "Song", artist: "Artist", collectionId: "album", collectionTitle: "Album", artworkUrl: "https://cdn.example/track.png" });
    mocks.getTrackById.mockResolvedValue({ id: "song", title: "Song", collectionId: "album", artworkKey: null, isActive: true });
    expect(await getPublicTrack("song")).toMatchObject({ artist: "HYMNZ", artworkUrl: "https://cdn.example/album.png" });
    mocks.getCollectionById.mockResolvedValue(null);
    expect(await getPublicTrack("song")).toMatchObject({ artworkUrl: null, collectionId: null });
  });
  it.each([null, { isActive: false }])("hides missing/inactive tracks", async (value) => {
    mocks.getTrackById.mockResolvedValue(value);
    expect(await getPublicTrack("song")).toBeNull();
    expect(mocks.getCollectionById).not.toHaveBeenCalled();
    expect(await generateMetadata({ params: Promise.resolve({ id: "song" }) })).toMatchObject({ robots: { index: false } });
  });
  it("uses the canonical track URL and branded image for search/social metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "song" }) });
    expect(metadata.alternates).toEqual({ canonical: "https://www.hymnz.com/track/song" });
    expect(metadata.openGraph).toMatchObject({ type: "music.song", images: [{ url: "https://www.hymnz.com/track/song/opengraph-image", width: 1200, height: 630, alt: "Song — Artist | HYMNZ" }] });
  });
});
