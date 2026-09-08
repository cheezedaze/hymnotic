import { describe, expect, it, vi } from "vitest";
import {
  FALLBACK_ARTWORK_URL,
  artworkCandidates,
  resolveArtworkUrl,
  resumeAudioFromRemoteControl,
} from "./mediaSession";

describe("media session artwork", () => {
  it("tries track, collection, then branded fallback artwork", () => {
    expect(artworkCandidates("track.png", "collection.jpg")).toEqual([
      "track.png",
      "collection.jpg",
      FALLBACK_ARTWORK_URL,
    ]);
  });

  it("uses the next candidate when artwork cannot be loaded", async () => {
    const load = vi
      .fn<(src: string) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(
      resolveArtworkUrl(["track.png", "collection.jpg"], load)
    ).resolves.toBe("collection.jpg");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never publishes an empty artwork list", async () => {
    await expect(
      resolveArtworkUrl(["broken.png"], async () => false)
    ).resolves.toBe(FALLBACK_ARTWORK_URL);
  });
});

describe("remote playback commands", () => {
  it("calls the audio element even when the store is already marked playing", () => {
    const markPlaying = vi.fn();
    const markPaused = vi.fn();
    const play = vi.fn().mockResolvedValue(undefined);

    resumeAudioFromRemoteControl(markPlaying, markPaused, {
      src: "track.mp3",
      play,
    });

    expect(markPlaying).toHaveBeenCalledOnce();
    expect(play).toHaveBeenCalledOnce();
    expect(markPaused).not.toHaveBeenCalled();
  });
});
