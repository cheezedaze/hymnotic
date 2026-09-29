import { describe, expect, it } from "vitest";
import { parseTrackLink, trackUrl } from "./urls";
import { buildShareText, buildShareUrl } from "@/lib/share/data";

describe("canonical track links", () => {
  it("encodes IDs and uses the canonical host regardless of deployment", () => {
    expect(trackUrl("A song & hymn")).toBe("https://www.hymnz.com/track/A%20song%20%26%20hymn");
    expect(buildShareUrl({ type: "track", id: "song", title: "Song" })).toBe(trackUrl("song"));
    expect(buildShareUrl({ type: "collection", id: "album", title: "Album" })).toBe("https://www.hymnz.com/collection/album");
    expect(buildShareText({ type: "track", id: "song", title: "Song" })).toBe("Listen to “Song” by HYMNZ on HYMNZ");
  });
  it("handles a canonical URL and discards autoplay, tracking, and fragment parameters", () => {
    expect(parseTrackLink("https://www.hymnz.com/track/song?play=evil&utm_source=email#player")).toBe("/track/song");
    expect(parseTrackLink(trackUrl("A song & hymn"))).toBe("/track/A%20song%20%26%20hymn");
  });
  it.each([
    "https://hymnz.com/track/song", "http://www.hymnz.com/track/song", "hymnz://track/song",
    "https://www.hymnz.com.evil.test/track/song", "https://www.hymnz.com@evil.test/track/song",
    "https://user@www.hymnz.com/track/song", "https://www.hymnz.com:444/track/song",
    "https://www.hymnz.com/track/", "https://www.hymnz.com/track/song/extra",
    "https://www.hymnz.com/track/%2Fadmin", "https://www.hymnz.com/track/%5Cadmin",
    "https://www.hymnz.com/track/%00", "https://www.hymnz.com/track/%ZZ",
    "https://www.hymnz.com/track/%2e%2e", "https://www.hymnz.com/admin", "not a URL",
  ])("ignores untrusted or malformed URLs: %s", (value) => {
    expect(parseTrackLink(value)).toBeNull();
  });
});
