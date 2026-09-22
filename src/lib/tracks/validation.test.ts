import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertTrackAudio, parseReleaseInput } from "./validation";
import { mediaExists } from "@/lib/s3/client";

vi.mock("@/lib/s3/client", () => ({ mediaExists: vi.fn() }));
const now = new Date("2026-09-22T12:00:00Z");

beforeEach(() => vi.mocked(mediaExists).mockReset().mockResolvedValue(true));

describe("release validation", () => {
  it.each([null, "", "audio/originals/song.wav", "audio/tracks/song.wav"])("rejects missing or unconverted audio: %s", async (key) => {
    await expect(assertTrackAudio(key)).rejects.toThrow("Upload the track audio");
    expect(mediaExists).not.toHaveBeenCalled();
  });
  it("rejects a failed upload even when an audio key was saved", async () => {
    vi.mocked(mediaExists).mockResolvedValue(false);
    await expect(assertTrackAudio("audio/tracks/song.mp3")).rejects.toThrow("could not be verified");
  });
  it("accepts a verified playback file", async () => {
    await expect(assertTrackAudio("audio/tracks/song.mp3")).resolves.toBeUndefined();
  });
  it("supports immediate release without an announcement or push", () => {
    expect(parseReleaseInput({ immediate: true }, now)).toEqual({ scheduledAt: now, announcementTitle: null, announcementBody: null, pushTitle: null, pushBody: null });
  });
  it("preserves the chosen instant across timezone offsets", () => {
    expect(parseReleaseInput({ scheduledAt: "2026-09-22T08:00:00-06:00" }, now).scheduledAt.toISOString()).toBe("2026-09-22T14:00:00.000Z");
  });
  it.each(["", "invalid", "2026-09-22T11:59:00Z"])("rejects invalid or past schedules: %s", (scheduledAt) => {
    expect(() => parseReleaseInput({ scheduledAt }, now)).toThrow("future");
  });
  it("rejects empty WYSIWYG markup and partial push messages", () => {
    expect(() => parseReleaseInput({ immediate: true, announcementTitle: "Release", announcementBody: "<p>&nbsp;</p>" }, now)).toThrow("title and content");
    expect(() => parseReleaseInput({ immediate: true, pushTitle: "Release" }, now)).toThrow("title and message");
  });
  it("enforces push limits", () => {
    expect(() => parseReleaseInput({ immediate: true, pushTitle: "x".repeat(101), pushBody: "Message" }, now)).toThrow("100");
  });
});
