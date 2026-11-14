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

/** Establish the native revision floor before a newly mounted controller sends commands. */
export function nativeRevisionFloor(localRevision: number, nativeRevision?: number): number {
  return Math.max(localRevision, nativeRevision ?? 0);
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
  // A failed Play or reached preview limit is an acknowledgement, not a
  // stale Pause. Queue/revision/track checks below still apply.
  const transportMatches = nativeState.isPlaying === desired.isPlaying ||
    (desired.isPlaying && !nativeState.isPlaying &&
      (nativeState.reason === "error" || nativeState.reason === "previewEnded"));
  const legacy = nativeState.revision === undefined &&
    nativeState.queueId === undefined && nativeState.queueTrackIds === undefined &&
    nativeState.shuffle === undefined && nativeState.repeat === undefined;
  if (legacy) {
    // Old binaries can identify their current track/index, but cannot echo the
    // queue identity or options. Never accept a track outside the desired queue.
    if (nativeState.queueCount !== desired.queueTrackIds.length ||
        desired.queueTrackIds[nativeState.queueIndex] !== nativeState.trackId) return false;
    return !hasPendingLocalCommand || (nativeState.trackId === desired.trackId &&
      nativeState.queueIndex === desired.queueIndex && transportMatches);
  }
  if (normalizedId(nativeState.queueId) !== normalizedId(desired.queueId)) return false;
  if (nativeState.shuffle !== desired.shuffle || nativeState.repeat !== desired.repeat) return false;

  const queueMatches = sameOrder(nativeState.queueTrackIds, desired.queueTrackIds);
  const isNativeShuffleCycle =
    !hasPendingLocalCommand &&
    (nativeState.reason === "ended" || nativeState.reason === "next") &&
    nativeState.shuffle === true &&
    sameMembers(nativeState.queueTrackIds, desired.queueTrackIds);
  if (!queueMatches && !isNativeShuffleCycle) return false;

  if (!hasPendingLocalCommand) return true;
  return nativeState.trackId === desired.trackId &&
    nativeState.queueIndex === desired.queueIndex &&
    transportMatches;
}
