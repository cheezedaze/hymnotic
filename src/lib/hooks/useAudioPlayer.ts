"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/lib/store/playerStore";

export function useAudioPlayer() {
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

    if (currentTrack.audioUrl) {
      // Real audio mode
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.src = currentTrack.audioUrl;

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

      // Increment play count
      fetch(`/api/tracks/${currentTrack.id}/play`, { method: "POST" }).catch(() => {});

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

    if (currentTrack.audioUrl && audioRef.current) {
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
      if (audioRef.current && currentTrack?.audioUrl) {
        audioRef.current.currentTime = time;
      }
      usePlayerStore.getState().seekTo(time);
    },
    [currentTrack]
  );

  return { seekTo, currentTime };
}
