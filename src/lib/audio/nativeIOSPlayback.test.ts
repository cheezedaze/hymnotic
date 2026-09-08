import { describe, expect, it, vi } from "vitest";
import type { ApiTrack } from "@/lib/types";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => "web",
    isPluginAvailable: () => false,
  },
  registerPlugin: () => ({}),
}));

import { nativePlaybackTracks } from "./nativeIOSPlayback";

function track(overrides: Partial<ApiTrack> = {}): ApiTrack {
  return {
    id: "come-come-ye-saints",
    collectionId: "pioneer",
    title: "Come, Come, Ye Saints",
    artist: "HYMNZ",
    artworkKey: null,
    artworkUrl: "https://cdn.example/track.jpg",
    audioKey: "audio/tracks/come-come-ye-saints.mp3",
    audioUrl: "/api/tracks/come-come-ye-saints/audio",
    audioFormat: "mp3",
    originalAudioKey: null,
    originalAudioUrl: null,
    videoKey: null,
    videoUrl: null,
    videoThumbnailKey: null,
    videoThumbnailUrl: null,
    duration: 272,
    trackNumber: 1,
    playCount: 0,
    favoriteCount: 0,
    hasVideo: false,
    videoCount: 0,
    hasLyrics: false,
    isActive: true,
    youtubeUrl: null,
    collectionArtworkUrl: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

describe("native iOS playback queue", () => {
  it("passes absolute authenticated audio and artwork URLs to AVPlayer", () => {
    vi.stubGlobal("window", {
      location: { href: "https://preview.example/library" },
    });

    expect(nativePlaybackTracks([track()])).toEqual([
      {
        id: "come-come-ye-saints",
        title: "Come, Come, Ye Saints",
        artist: "HYMNZ",
        audioUrl:
          "https://preview.example/api/tracks/come-come-ye-saints/audio",
        artworkUrl: "https://cdn.example/track.jpg",
        duration: 272,
      },
    ]);
  });

  it("uses collection artwork, then the branded fallback", () => {
    vi.stubGlobal("window", {
      location: { href: "https://www.hymnz.com/library" },
    });

    const [collection, fallback] = nativePlaybackTracks([
      track({ artworkUrl: null, collectionArtworkUrl: "/collection.jpg" }),
      track({ id: "second", artworkUrl: null, collectionArtworkUrl: null }),
    ]);

    expect(collection.artworkUrl).toBe("https://www.hymnz.com/collection.jpg");
    expect(fallback.artworkUrl).toBe(
      "https://www.hymnz.com/images/album-all-tracks.jpg"
    );
  });

  it("omits queue entries that do not have audio", () => {
    vi.stubGlobal("window", {
      location: { href: "https://www.hymnz.com/" },
    });

    expect(nativePlaybackTracks([track({ audioUrl: null })])).toEqual([]);
  });
});
