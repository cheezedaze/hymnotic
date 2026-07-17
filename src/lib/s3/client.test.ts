import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signAudioUrl, buildTrackMediaUrls } from "./client";

// A throwaway RSA private key can be provided via env for the signed-path test.
const TEST_PRIVATE_KEY = process.env.TEST_CF_PRIVATE_KEY ?? "";

describe("signAudioUrl", () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CDN_URL = "https://d2y722s9xxtvrs.cloudfront.net";
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  it("falls back to an unsigned CDN URL when signing keys are absent", () => {
    delete process.env.CLOUDFRONT_KEY_PAIR_ID;
    delete process.env.CLOUDFRONT_PRIVATE_KEY;
    const url = signAudioUrl("audio/tracks/x.mp3");
    expect(url).toBe("https://d2y722s9xxtvrs.cloudfront.net/audio/tracks/x.mp3");
  });

  it("returns null for a null key", () => {
    expect(signAudioUrl(null)).toBeNull();
  });

  it("produces a signed URL with CloudFront query params when keys are set", () => {
    if (!TEST_PRIVATE_KEY) return; // skip if no test key provided in env
    process.env.CLOUDFRONT_KEY_PAIR_ID = "TESTKEYPAIRID";
    process.env.CLOUDFRONT_PRIVATE_KEY = TEST_PRIVATE_KEY;
    const url = signAudioUrl("audio/tracks/x.mp3")!;
    expect(url).toContain("audio/tracks/x.mp3");
    expect(url).toContain("Expires=");
    expect(url).toContain("Signature=");
    expect(url).toContain("Key-Pair-Id=TESTKEYPAIRID");
  });
});

describe("buildTrackMediaUrls audio safety", () => {
  it("never emits a raw CDN audio URL", () => {
    process.env.NEXT_PUBLIC_CDN_URL = "https://d2y722s9xxtvrs.cloudfront.net";
    const urls = buildTrackMediaUrls({
      artworkKey: "images/artwork/a.jpg",
      audioKey: "audio/tracks/x.mp3",
      videoKey: null,
      videoThumbnailKey: null,
      originalAudioKey: "audio/originals/x.wav",
    });
    expect(urls.audioUrl).toBeNull();
    expect(urls.originalAudioUrl).toBeNull();
    // artwork stays a real URL
    expect(urls.artworkUrl).toContain("images/artwork/a.jpg");
  });
});
