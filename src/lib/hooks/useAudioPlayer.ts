"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { getOrCreateAudioElement, stopAudio } from "@/lib/audio/audioContext";

/**
 * Core audio engine hook — should only be called ONCE (in AppShell).
 * Uses the module-level singleton audio element from audioContext.ts
 * so that even if the component remounts, no orphaned audio plays.
 */
export function useAudioPlayer() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const listenersRef = useRef<{
    onLoaded: () => void;
    onTimeUpdate: () => void;
    onEnded: () => void;
  } | null>(null);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const clearSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** Remove any previously attached event listeners from the audio element. */
  const removeListeners = useCallback(() => {
    if (listenersRef.current) {
      const audio = getOrCreateAudioElement();
      audio.removeEventListener("loadedmetadata", listenersRef.current.onLoaded);
      audio.removeEventListener("timeupdate", listenersRef.current.onTimeUpdate);
      audio.removeEventListener("ended", listenersRef.current.onEnded);
      listenersRef.current = null;
    }
  }, []);

  // Handle track changes — keyed by track ID
  useEffect(() => {
    if (!currentTrack) {
      // No track: stop everything
      clearSimulation();
      removeListeners();
      stopAudio();
      currentTrackIdRef.current = null;
      return;
    }

    // Skip if the same track is already loaded (don't restart)
    if (currentTrackIdRef.current === currentTrack.id) {
      return;
    }
    currentTrackIdRef.current = currentTrack.id;

    clearSimulation();
    removeListeners();

    const audio = getOrCreateAudioElement();

    if (currentTrack.audioUrl) {
      // Stop any current playback before loading new source
      audio.pause();
      audio.src = currentTrack.audioUrl;
      audio.load();

      const onLoaded = () => {
        usePlayerStore.getState().setDuration(audio.duration);
        // Auto-play once the audio is actually ready
        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch(() => {});
        }
      };
      const onTimeUpdate = () => {
        usePlayerStore.getState().setCurrentTime(audio.currentTime);
      };
      const onEnded = () => {
        usePlayerStore.getState().next();
      };

      audio.addEventListener("loadedmetadata", onLoaded);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("ended", onEnded);

      // Store references so we can remove them later
      listenersRef.current = { onLoaded, onTimeUpdate, onEnded };

      // Increment play count
      fetch(`/api/tracks/${currentTrack.id}/play`, { method: "POST" }).catch(
        () => {}
      );
    } else {
      // Simulated mode — stop real audio, duration comes from track data
      audio.pause();
      audio.removeAttribute("src");
      usePlayerStore.getState().setDuration(currentTrack.duration);
    }

    return () => {
      removeListeners();
    };
  }, [currentTrack?.id, clearSimulation, removeListeners]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle play/pause
  useEffect(() => {
    if (!currentTrack) return;

    const audio = getOrCreateAudioElement();

    if (currentTrack.audioUrl) {
      if (isPlaying) {
        // Only call play() if the audio is ready (has enough data).
        // Otherwise, the loadedmetadata handler above will start playback.
        if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          audio.play().catch(() => {});
        }
      } else {
        audio.pause();
      }
    } else {
      // Simulated playback
      clearSimulation();
      if (isPlaying) {
        intervalRef.current = setInterval(() => {
          const state = usePlayerStore.getState();
          const next = state.currentTime + 0.25;
          if (next >= state.duration) {
            clearSimulation();
            state.next();
          } else {
            state.setCurrentTime(next);
          }
        }, 250);
      }
    }

    return clearSimulation;
  }, [isPlaying, currentTrack?.id, clearSimulation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount — pause audio so nothing plays after navigation
  useEffect(() => {
    return () => {
      clearSimulation();
      removeListeners();
      // Pause but don't destroy the element — user might navigate back
      const audio = getOrCreateAudioElement();
      audio.pause();
    };
  }, [clearSimulation, removeListeners]);
}
