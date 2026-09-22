"use client";

import { useCallback, useEffect, useRef } from "react";
import { stopAudio } from "@/lib/audio/audioContext";
import {
  hasNativeIOSPlayback,
  NativeIOSPlayback,
  nativePlaybackTracks,
  type NativePlaybackState,
} from "@/lib/audio/nativeIOSPlayback";
import {
  type DesiredNativePlaybackState,
  shouldApplyNativePlaybackState,
} from "@/lib/audio/nativePlaybackSync";
import { type PlayerState, usePlayerStore } from "@/lib/store/playerStore";

function sameOrder(left: string[] | undefined, right: string[]): boolean {
  return !!left && left.length === right.length && left.every((id, index) => id === right[index]);
}

function desiredNativeState(state: PlayerState, revision: number): DesiredNativePlaybackState {
  const queueTrackIds = state.queue.flatMap((track) => track.audioUrl ? [track.id] : []);
  return {
    revision,
    queueId: state.queueCollectionId ?? undefined,
    queueTrackIds,
    queueIndex: Math.max(0, queueTrackIds.indexOf(state.currentTrack?.id ?? "")),
    trackId: state.currentTrack?.id,
    isPlaying: state.isPlaying,
    shuffle: state.shuffle,
    repeat: state.repeat,
  };
}

function queueControlSignature(state: PlayerState): string {
  return JSON.stringify([
    state.queueCollectionId,
    state.queue.map((track) => track.id),
    state.currentTrack?.id ?? null,
    state.shuffle,
    state.repeat,
  ]);
}

export function useNativeIOSAudioPlayer() {
  const queue = usePlayerStore((state) => state.queue);
  const sourceQueue = usePlayerStore((state) => state.sourceQueue);
  const queueCollectionId = usePlayerStore((state) => state.queueCollectionId);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const repeat = usePlayerStore((state) => state.repeat);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const nativeStateRef = useRef<NativePlaybackState | null>(null);
  const applyingNativeStateRef = useRef(false);
  const pendingLocalCommandRef = useRef(false);
  const queueRevisionRef = useRef(1);

  const applyNativeState = useCallback((nativeState: NativePlaybackState) => {
    const store = usePlayerStore.getState();
    const desired = desiredNativeState(store, queueRevisionRef.current);
    if (!shouldApplyNativePlaybackState(
      nativeState,
      desired,
      pendingLocalCommandRef.current
    )) {
      return;
    }

    queueRevisionRef.current = Math.max(
      queueRevisionRef.current,
      nativeState.revision ?? 0
    );
    pendingLocalCommandRef.current = false;
    nativeStateRef.current = nativeState;
    const knownTracks = new Map(
      [...store.sourceQueue, ...store.queue].map((track) => [track.id, track])
    );
    const nativeQueue = nativeState.queueTrackIds
      ?.map((id) => knownTracks.get(id))
      .filter((track): track is NonNullable<typeof track> => !!track);
    let nextQueue = store.queue;
    if (
      nativeState.queueTrackIds &&
      nativeQueue?.length === nativeState.queueTrackIds.length
    ) {
      nextQueue = nativeQueue;
    }
    const track = nativeState.trackId
      ? knownTracks.get(nativeState.trackId)
      : undefined;
    const queueId = nativeState.queueId || store.queueCollectionId;
    const position =
      nativeState.reason === "loaded" &&
      nativeState.trackId === store.currentTrack?.id &&
      nativeState.position === 0 &&
      store.currentTime > 0
        ? store.currentTime
        : nativeState.position;
    const nextIndex = track
      ? nextQueue.findIndex((item) => item.id === track.id)
      : nativeState.queueIndex;

    let shuffleQueues = store.shuffleQueues;
    if (nativeState.shuffle && queueId && nativeState.queueTrackIds?.length) {
      const existing = shuffleQueues[queueId];
      shuffleQueues = {
        ...shuffleQueues,
        [queueId]: {
          order: nativeState.queueTrackIds,
          position: Math.max(0, nativeState.queueIndex),
          sourceHash: existing?.sourceHash ?? store.sourceQueue
            .map((item) => item.id)
            .sort()
            .join("|"),
          generatedAt: existing?.generatedAt ?? Date.now(),
        },
      };
    }

    applyingNativeStateRef.current = true;
    try {
      usePlayerStore.setState({
        ...(nextQueue !== store.queue ? { queue: nextQueue } : {}),
        ...(track
          ? {
              currentTrack: track,
              currentIndex: nextIndex >= 0 ? nextIndex : nativeState.queueIndex,
            }
          : {}),
        ...(queueId ? { queueCollectionId: queueId } : {}),
        ...(nativeState.shuffle !== undefined ? { shuffle: nativeState.shuffle } : {}),
        ...(nativeState.repeat ? { repeat: nativeState.repeat } : {}),
        ...(nativeState.shuffle && queueId
          ? { activeShuffleCollectionId: queueId, shuffleQueues }
          : nativeState.shuffle === false
            ? { activeShuffleCollectionId: null }
            : {}),
        currentTime: position,
        duration:
          nativeState.duration > 0
            ? nativeState.duration
            : track?.duration ?? store.duration,
        isPlaying: nativeState.isPlaying,
        ...(nativeState.reason === "previewEnded"
          ? {
              isPreviewEnded: true,
              showUpgradeModal: true,
              showPreviewActions: true,
            }
          : {}),
      });
    } finally {
      applyingNativeStateRef.current = false;
    }
  }, []);

  useEffect(() => usePlayerStore.subscribe((state, previousState) => {
    if (applyingNativeStateRef.current) return;

    const queueChanged =
      queueControlSignature(state) !== queueControlSignature(previousState);
    const transportChanged = state.isPlaying !== previousState.isPlaying;
    if (!queueChanged && !transportChanged) return;

    if (queueChanged) queueRevisionRef.current += 1;
    pendingLocalCommandRef.current = true;
  }), []);

  useEffect(() => {
    if (!hasNativeIOSPlayback()) return;

    let listener: Awaited<
      ReturnType<typeof NativeIOSPlayback.addListener>
    > | undefined;
    let cancelled = false;

    void NativeIOSPlayback.addListener("playbackState", applyNativeState)
      .then((handle) => {
        if (cancelled) void handle.remove();
        else listener = handle;
      })
      .catch(() => {});

    const syncState = () => {
      if (document.visibilityState !== "visible") return;
      void NativeIOSPlayback.getState().then(applyNativeState).catch(() => {});
    };
    document.addEventListener("visibilitychange", syncState);
    syncState();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", syncState);
      void listener?.remove();
    };
  }, [applyNativeState]);

  useEffect(() => {
    if (!hasNativeIOSPlayback() || !currentTrack) return;

    // A WKWebView audio element and AVPlayer cannot safely share ownership of
    // the same iOS Now Playing session. Native playback is the sole iOS owner.
    stopAudio();

    const store = usePlayerStore.getState();
    const tracks = nativePlaybackTracks(queue).map((track) =>
      track.id === currentTrack.id && store.isPreviewMode
        ? {
            ...track,
            previewLimit:
              store.previewCheckpoint ?? store.previewDuration ?? undefined,
          }
        : track
    );
    const nativeIndex = tracks.findIndex((track) => track.id === currentTrack.id);
    if (nativeIndex === -1) return;

    const desiredOrder = tracks.map((track) => track.id);
    const nativeState = nativeStateRef.current;
    const queueMatches =
      (nativeState?.revision === undefined || nativeState.revision >= queueRevisionRef.current) &&
      (nativeState?.queueId || undefined) === (queueCollectionId ?? undefined) &&
      sameOrder(nativeState?.queueTrackIds, desiredOrder);
    const trackMatches =
      nativeState?.trackId === currentTrack.id &&
      nativeState.queueIndex === nativeIndex;
    const settingsMatch =
      nativeState?.repeat === repeat && nativeState?.shuffle === shuffle;

    if (nativeState && queueMatches && trackMatches && settingsMatch) {
      if (nativeState.isPlaying !== isPlaying) {
        const command = isPlaying
          ? NativeIOSPlayback.play()
          : NativeIOSPlayback.pause();
        void command.then(applyNativeState).catch(() =>
          usePlayerStore.getState().pause()
        );
      }
      return;
    }

    void NativeIOSPlayback.loadQueue({
      revision: queueRevisionRef.current,
      tracks,
      queueId: queueCollectionId ?? undefined,
      queueIndex: nativeIndex,
      position: store.currentTime,
      isPlaying,
      shuffle,
      repeat,
    })
      .then(applyNativeState)
      .catch(() => usePlayerStore.getState().pause());
  }, [queue, sourceQueue, queueCollectionId, currentIndex, currentTrack, isPlaying, repeat, shuffle, applyNativeState]);
}
