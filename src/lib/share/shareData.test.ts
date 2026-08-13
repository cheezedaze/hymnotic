import { describe, expect, it } from "vitest";
import {
  buildSharePayload,
  buildShareText,
  buildShareUrl,
  buildTrackShareImageUrl,
  type ShareData,
} from "./shareData";

const track: ShareData = {
  type: "track",
  id: "carry on",
  title: "Carry On",
  artist: "HYMNZ",
  artworkUrl: "https://cdn.example/carry-on.jpg",
};

describe("shareData", () => {
  it("builds a canonical encoded track URL", () => {
    expect(buildShareUrl(track)).toBe(
      "https://www.hymnz.com/track/carry%20on"
    );
  });

  it("builds the canonical branded image URL", () => {
    expect(buildTrackShareImageUrl("carry on")).toBe(
      "https://www.hymnz.com/track/carry%20on/opengraph-image"
    );
  });

  it("builds literal track share text and payload", () => {
    expect(buildShareText(track)).toBe(
      "Listen to “Carry On” by HYMNZ on HYMNZ"
    );
    expect(buildSharePayload(track)).toEqual({
      title: "Carry On",
      text: "Listen to “Carry On” by HYMNZ on HYMNZ",
      url: "https://www.hymnz.com/track/carry%20on",
    });
  });

  it("uses HYMNZ when a track artist is absent", () => {
    expect(buildShareText({ ...track, artist: undefined })).toBe(
      "Listen to “Carry On” by HYMNZ on HYMNZ"
    );
  });

  it("preserves the collection sharing contract", () => {
    const collection: ShareData = {
      type: "collection",
      id: "sands-of-the-sea",
      title: "Sands of the Sea",
    };
    expect(buildSharePayload(collection)).toEqual({
      title: "Sands of the Sea",
      text: "Check out “Sands of the Sea” on HYMNZ",
      url: "https://www.hymnz.com/collection/sands-of-the-sea",
    });
  });
});
