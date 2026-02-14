"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/lib/store/playerStore";

export function useAudioPlayer() {
  // #region agent log
  useEffect(() => {
    fetch("/api/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "useAudioPlayer.ts:hook",
        message: "useAudioPlayer hook ran",
        data: {},
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {});
  }, []);
  // #endregion
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);

  const clearSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle track changes
  useEffect(() => {
    if (!currentTrack) return;

    clearSimulation();

    if (currentTrack.audioSrc) {
      // Real audio mode
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.src = currentTrack.audioSrc;

      const onLoaded = () => {
        usePlayerStore.getState().setDuration(audio.duration);
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

      return () => {
        audio.removeEventListener("loadedmetadata", onLoaded);
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("ended", onEnded);
      };
    } else {
      // Simulated mode - duration comes from track data
      usePlayerStore.getState().setDuration(currentTrack.duration);
    }
  }, [currentTrack, clearSimulation]);

  // Handle play/pause
  useEffect(() => {
    if (!currentTrack) return;

    if (currentTrack.audioSrc && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
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
  }, [isPlaying, currentTrack, clearSimulation]);

  // Handle seek
  const seekTo = useCallback(
    (time: number) => {
      if (audioRef.current && currentTrack?.audioSrc) {
        audioRef.current.currentTime = time;
      }
      usePlayerStore.getState().seekTo(time);
    },
    [currentTrack]
  );

  return { seekTo, currentTime };
}
