"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import {
  getOrCreateAudioElement,
  stopAudio,
  fadeAudioVolume,
} from "@/lib/audio/audioContext";
import { playVoiceover, stopVoiceover } from "@/lib/audio/voiceoverContext";

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "";
const VOICEOVER_URL = `${CDN_URL}/audio/system/hymnz-jingle.mp3`;

/**
 * Core audio engine hook — should only be called ONCE (in AppShell).
 * Uses the module-level singleton audio element from audioContext.ts
 * so that even if the component remounts, no orphaned audio plays.
 */
export function useAudioPlayer() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const fadingRef = useRef(false);
  const bgSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      audio.removeEventListener(
        "loadedmetadata",
        listenersRef.current.onLoaded
      );
      audio.removeEventListener(
        "timeupdate",
        listenersRef.current.onTimeUpdate
      );
      audio.removeEventListener("ended", listenersRef.current.onEnded);
      listenersRef.current = null;
    }
  }, []);

  /**
   * Handle the preview checkpoint:
   * Fade music to silence, pause it, then play the jingle.
   * No overlap — the jingle only starts after the music is fully silent.
   */
  const handlePreviewEnd = useCallback(async () => {
    if (fadingRef.current) return;
    fadingRef.current = true;

    // Mark preview as ended immediately so stale interval ticks can't re-trigger.
    // Keep previewCheckpoint intact so the scrub clamp continues to work.
    usePlayerStore.setState({ isPreviewEnded: true });

    const audio = getOrCreateAudioElement();

    // Background safety: hard-pause after 2s even if the fade is completely frozen
    // (iOS can suspend all timers when the screen is off in extreme cases)
    if (bgSafetyRef.current) clearTimeout(bgSafetyRef.current);
    bgSafetyRef.current = setTimeout(() => {
      audio.pause();
      audio.volume = 0;
    }, 2000);

    // Fade music completely to silence over 1.5s
    await fadeAudioVolume(1, 0, 1500);

    // Pause the music now that it's silent
    audio.pause();
    if (bgSafetyRef.current) {
      clearTimeout(bgSafetyRef.current);
      bgSafetyRef.current = null;
    }

    // Play jingle after the music is fully stopped
    const store = usePlayerStore.getState();
    store.setVoiceoverPlaying(true);
    store.setShowPreviewActions(true);
    store.setShowUpgradeModal(true);
    await playVoiceover(VOICEOVER_URL);
    store.setVoiceoverPlaying(false);

    // Reset position to start and restore volume for next play
    audio.currentTime = 0;
    audio.volume = 1;
    usePlayerStore.setState({ isPlaying: false, currentTime: 0 });

    fadingRef.current = false;
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
    fadingRef.current = false;

    clearSimulation();
    removeListeners();
    stopVoiceover();

    const audio = getOrCreateAudioElement();
    // Reset volume for new track
    audio.volume = 1;

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
        const state = usePlayerStore.getState();
        state.setCurrentTime(audio.currentTime);

        // Preview enforcement: check if we've hit the preview checkpoint
        if (
          state.isPreviewMode &&
          state.previewCheckpoint !== null &&
          audio.currentTime >= state.previewCheckpoint &&
          !state.isPreviewEnded &&
          !fadingRef.current
        ) {
          handlePreviewEnd();
        }
      };
      const onEnded = () => {
        usePlayerStore.getState().next();
      };

      audio.addEventListener("loadedmetadata", onLoaded);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("ended", onEnded);

      // Store references so we can remove them later
      listenersRef.current = { onLoaded, onTimeUpdate, onEnded };

      // Increment play count (skip for visitors — avoids 401 console noise)
      if (useSubscriptionStore.getState().effectiveTier() !== "visitor") {
        fetch(`/api/tracks/${currentTrack.id}/play`, { method: "POST" }).catch(
          () => {}
        );
      }
    } else {
      // Simulated mode — stop real audio, duration comes from track data
      audio.pause();
      audio.removeAttribute("src");
      usePlayerStore.getState().setDuration(currentTrack.duration);
    }

    return () => {
      removeListeners();
    };
  }, [currentTrack?.id, clearSimulation, removeListeners, handlePreviewEnd]); // eslint-disable-line react-hooks/exhaustive-deps

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

          // Preview enforcement for simulated playback
          if (
            state.isPreviewMode &&
            state.previewCheckpoint !== null &&
            next >= state.previewCheckpoint &&
            !state.isPreviewEnded &&
            !fadingRef.current
          ) {
            handlePreviewEnd();
          }

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
  }, [isPlaying, currentTrack?.id, clearSimulation, handlePreviewEnd]); // eslint-disable-line react-hooks/exhaustive-deps

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
