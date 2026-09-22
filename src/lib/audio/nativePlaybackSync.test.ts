import { describe, expect, it } from "vitest";
import type { NativePlaybackState } from "./nativeIOSPlayback";
import {
  type DesiredNativePlaybackState,
  shouldApplyNativePlaybackState,
} from "./nativePlaybackSync";

const desired: DesiredNativePlaybackState = {
  revision: 3,
  queueId: "collection-a",
  queueTrackIds: ["a-1", "a-2", "a-3"],
  queueIndex: 1,
  trackId: "a-2",
  isPlaying: true,
  shuffle: false,
  repeat: "off",
};

function snapshot(overrides: Partial<NativePlaybackState> = {}): NativePlaybackState {
  return {
    revision: 3,
    queueId: "collection-a",
    queueTrackIds: ["a-1", "a-2", "a-3"],
    queueIndex: 1,
    queueCount: 3,
    trackId: "a-2",
    position: 10,
    duration: 180,
    isPlaying: true,
    shuffle: false,
    repeat: "off",
    reason: "time",
    ...overrides,
  };
}

describe("native playback synchronization", () => {
  it("rejects an older native shuffle state after the UI toggles shuffle", () => {
    expect(shouldApplyNativePlaybackState(snapshot({
      revision: 2,
      shuffle: true,
      queueTrackIds: ["a-2", "a-1", "a-3"],
    }), desired, true)).toBe(false);
  });

  it("rejects the previous song while a local Next command is pending", () => {
    expect(shouldApplyNativePlaybackState(snapshot({
      queueIndex: 0,
      trackId: "a-1",
    }), desired, true)).toBe(false);
  });

  it("accepts a native remote-control Next event when no local command is pending", () => {
    expect(shouldApplyNativePlaybackState(snapshot({
      queueIndex: 2,
      trackId: "a-3",
      reason: "next",
    }), desired, false)).toBe(true);
  });

  it("accepts a matching snapshot from a pre-revision TestFlight build", () => {
    expect(shouldApplyNativePlaybackState(snapshot({
      revision: undefined,
    }), desired, false)).toBe(true);
  });

  it("accepts a completed native shuffle cycle containing only the same collection", () => {
    const shuffledDesired = { ...desired, shuffle: true };
    expect(shouldApplyNativePlaybackState(snapshot({
      shuffle: true,
      queueIndex: 0,
      trackId: "a-3",
      queueTrackIds: ["a-3", "a-1", "a-2"],
      reason: "ended",
    }), shuffledDesired, false)).toBe(true);
  });
});
