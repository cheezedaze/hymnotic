"use client";

import { useCallback, useEffect } from "react";
import { stopAudio } from "@/lib/audio/audioContext";
import {
  hasNativeIOSPlayback,
  NativeIOSPlayback,
  nativePlaybackTracks,
  type NativePlaybackState,
} from "@/lib/audio/nativeIOSPlayback";
import { usePlayerStore } from "@/lib/store/playerStore";

export function useNativeIOSAudioPlayer() {
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const repeat = usePlayerStore((state) => state.repeat);

  const applyNativeState = useCallback((nativeState: NativePlaybackState) => {
    const store = usePlayerStore.getState();
    const track = nativeState.trackId
      ? store.queue.find((item) => item.id === nativeState.trackId)
      : undefined;

    if (track && store.currentTrack?.id !== track.id) {
      store.playTrack(track, store.queue);
    }

    usePlayerStore.setState({
      ...(track
        ? {
            currentTrack: track,
            currentIndex: store.queue.findIndex((item) => item.id === track.id),
          }
        : {}),
      currentTime: nativeState.position,
      duration:
        nativeState.duration > 0
          ? nativeState.duration
          : track?.duration ?? store.duration,
      isPlaying: nativeState.isPlaying,
    });
  }, []);

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

    const tracks = nativePlaybackTracks(queue);
    const nativeIndex = tracks.findIndex((track) => track.id === currentTrack.id);
    if (nativeIndex === -1) return;

    void NativeIOSPlayback.loadQueue({
      tracks,
      queueIndex: nativeIndex,
      position: usePlayerStore.getState().currentTime,
      isPlaying,
      repeat,
    })
      .then(applyNativeState)
      .catch(() => usePlayerStore.getState().pause());
  }, [queue, currentIndex, currentTrack, isPlaying, repeat, applyNativeState]);
}
