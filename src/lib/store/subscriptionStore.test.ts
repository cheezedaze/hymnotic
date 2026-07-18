import { describe, it, expect } from "vitest";
import { recomputeTrackAccess } from "./subscriptionStore";
import { type ApiTrack } from "@/lib/types";

const SACRED7 = ["s1", "s2"];

function track(partial: Partial<ApiTrack>): ApiTrack {
  return { id: "x", duration: 200, ...partial } as ApiTrack;
}

describe("recomputeTrackAccess", () => {
  it("keeps a free user's available one-time free listen FULL (regression)", () => {
    // Server marked a non-Sacred-7 track as an available free listen.
    const [t] = recomputeTrackAccess(
      [track({ id: "x", isFreeListen: true, duration: 200 })],
      "free",
      SACRED7
    );
    expect(t.isLocked).toBe(false);
    expect(t.previewDuration).toBe(200);
  });

  it("locks a free user's consumed free listen to a 60s preview", () => {
    const [t] = recomputeTrackAccess(
      [track({ id: "x", isFreeListen: false, duration: 200 })],
      "free",
      SACRED7
    );
    expect(t.isLocked).toBe(true);
    expect(t.previewDuration).toBe(60);
  });

  it("keeps Sacred 7 tracks full for free users", () => {
    const [t] = recomputeTrackAccess(
      [track({ id: "s1", isFreeListen: false, duration: 200 })],
      "free",
      SACRED7
    );
    expect(t.isLocked).toBe(false);
    expect(t.previewDuration).toBe(200);
  });

  it("gives paid users full access to everything", () => {
    const [t] = recomputeTrackAccess(
      [track({ id: "x", isFreeListen: false, duration: 200 })],
      "paid",
      SACRED7
    );
    expect(t.isLocked).toBe(false);
  });

  it("never unlocks for visitors, even on a free-listen track (30s preview)", () => {
    const [t] = recomputeTrackAccess(
      [track({ id: "x", isFreeListen: true, duration: 200 })],
      "visitor",
      SACRED7
    );
    expect(t.isLocked).toBe(true);
    expect(t.previewDuration).toBe(30);
  });

  it("keeps the featured hero full for free users", () => {
    const [t] = recomputeTrackAccess(
      [track({ id: "feat", isFeatured: true, duration: 200 })],
      "free",
      SACRED7
    );
    expect(t.isLocked).toBe(false);
  });
});
