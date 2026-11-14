import { describe, expect, it } from "vitest";
import type { NativePlaybackState } from "./nativeIOSPlayback";
import {
  type DesiredNativePlaybackState,
  shouldApplyNativePlaybackState,
  nativeRevisionFloor,
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


describe("native release compatibility", () => {
  const legacy = snapshot({ revision: undefined, queueId: undefined,
    queueTrackIds: undefined, shuffle: undefined, repeat: undefined });
  it("accepts the actual old-binary payload without new metadata", () => {
    expect(shouldApplyNativePlaybackState(legacy, desired, false)).toBe(true);
    expect(shouldApplyNativePlaybackState(legacy, desired, true)).toBe(true);
  });
  it("rejects unrelated or stale legacy queue events", () => {
    expect(shouldApplyNativePlaybackState({ ...legacy, trackId: "other" }, desired, false)).toBe(false);
    expect(shouldApplyNativePlaybackState({ ...legacy, queueCount: 9 }, desired, false)).toBe(false);
    expect(shouldApplyNativePlaybackState({ ...legacy, trackId: "a-3", queueIndex: 2 }, desired, true)).toBe(false);
  });
  it("imports a retained native revision before a different queue is loaded on remount", () => {
    const floor = nativeRevisionFloor(1, 27);
    expect(floor).toBe(27);
    expect(nativeRevisionFloor(30, 27)).toBe(30);
    expect(nativeRevisionFloor(1, undefined)).toBe(1);
    // The stale snapshot can be rejected without losing its revision floor.
    expect(shouldApplyNativePlaybackState(snapshot({ revision: 27, queueId: "old" }),
      { ...desired, revision: floor }, false)).toBe(false);
  });
  it("accepts lock-screen Next wrapping and reshuffling the same queue", () => {
    const next = snapshot({ shuffle: true, reason: "next", queueIndex: 0,
      trackId: "a-3", queueTrackIds: ["a-3", "a-1", "a-2"] });
    expect(shouldApplyNativePlaybackState(next, { ...desired, shuffle: true }, false)).toBe(true);
    expect(shouldApplyNativePlaybackState(next, { ...desired, shuffle: true }, true)).toBe(false);
    expect(shouldApplyNativePlaybackState({ ...next, queueTrackIds: ["other", "a-1", "a-2"] },
      { ...desired, shuffle: true }, false)).toBe(false);
  });
});


describe("pending Play terminal acknowledgements", () => {
  it.each(["error", "previewEnded"] as const)("accepts a matching %s instead of leaving Play pending", (reason) => {
    const terminal = snapshot({ reason, isPlaying: false });
    expect(shouldApplyNativePlaybackState(terminal, desired, true)).toBe(true);
    expect(shouldApplyNativePlaybackState({ ...terminal, revision: undefined, queueId: undefined,
      queueTrackIds: undefined, shuffle: undefined, repeat: undefined }, desired, true)).toBe(true);
  });
  it.each(["error", "previewEnded"] as const)("still rejects stale/unrelated %s", (reason) => {
    const terminal = snapshot({ reason, isPlaying: false });
    expect(shouldApplyNativePlaybackState({ ...terminal, revision: 2 }, desired, true)).toBe(false);
    expect(shouldApplyNativePlaybackState({ ...terminal, trackId: "a-3", queueIndex: 2 }, desired, true)).toBe(false);
    expect(shouldApplyNativePlaybackState({ ...terminal, queueId: "other" }, desired, true)).toBe(false);
    expect(shouldApplyNativePlaybackState({ ...terminal, queueTrackIds: ["a-1", "a-3", "a-2"] }, desired, true)).toBe(false);
    expect(shouldApplyNativePlaybackState({ ...terminal, revision: undefined, queueId: undefined,
      queueTrackIds: undefined, shuffle: undefined, repeat: undefined,
      trackId: "a-3", queueIndex: 2 }, desired, true)).toBe(false);
  });
  it("does not treat an ordinary paused snapshot as a Play acknowledgement", () => {
    expect(shouldApplyNativePlaybackState(snapshot({ reason: "pause", isPlaying: false }), desired, true)).toBe(false);
  });
});
