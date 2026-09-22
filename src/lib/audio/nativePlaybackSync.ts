import type { NativePlaybackState } from "./nativeIOSPlayback";

export interface DesiredNativePlaybackState {
  revision: number;
  queueId?: string;
  queueTrackIds: string[];
  queueIndex: number;
  trackId?: string;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
}

function normalizedId(id: string | null | undefined): string {
  return id ?? "";
}

function sameOrder(left: string[] | undefined, right: string[]): boolean {
  return !!left && left.length === right.length && left.every((id, index) => id === right[index]);
}

function sameMembers(left: string[] | undefined, right: string[]): boolean {
  return !!left && left.length === right.length && new Set(left).size === left.length &&
    left.every((id) => right.includes(id));
}

/**
 * Native transport events may advance the current song, but an older native
 * queue must never overwrite a newer queue/shuffle choice made in the UI.
 */
export function shouldApplyNativePlaybackState(
  nativeState: NativePlaybackState,
  desired: DesiredNativePlaybackState,
  hasPendingLocalCommand: boolean
): boolean {
  // Older TestFlight builds do not report a revision. Keep them functional
  // during the web/native rollout, while newer builds get strict stale-event
  // rejection from the revision check.
  if (nativeState.revision !== undefined && nativeState.revision < desired.revision) return false;
  if (normalizedId(nativeState.queueId) !== normalizedId(desired.queueId)) return false;
  if (nativeState.shuffle !== desired.shuffle || nativeState.repeat !== desired.repeat) return false;

  const queueMatches = sameOrder(nativeState.queueTrackIds, desired.queueTrackIds);
  const isNativeShuffleCycle =
    !hasPendingLocalCommand &&
    nativeState.reason === "ended" &&
    nativeState.shuffle === true &&
    sameMembers(nativeState.queueTrackIds, desired.queueTrackIds);
  if (!queueMatches && !isNativeShuffleCycle) return false;

  if (!hasPendingLocalCommand) return true;
  return nativeState.trackId === desired.trackId &&
    nativeState.queueIndex === desired.queueIndex &&
    nativeState.isPlaying === desired.isPlaying;
}
