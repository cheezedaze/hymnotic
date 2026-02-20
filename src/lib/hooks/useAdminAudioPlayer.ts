"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export interface AdminAudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
}

export interface UseAdminAudioPlayerReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  state: AdminAudioState;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
}

export function useAdminAudioPlayer(
  audioUrl: string | null
): UseAdminAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AdminAudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
  });

  // Create audio element once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  // Load/reload when audioUrl changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioUrl) {
      audio.src = "";
      setState({ isPlaying: false, currentTime: 0, duration: 0, isLoaded: false });
      return;
    }

    audio.src = audioUrl;
    audio.load();
    setState((s) => ({ ...s, isPlaying: false, currentTime: 0, isLoaded: false }));

    const onLoadedMetadata = () => {
      setState((s) => ({
        ...s,
        duration: audio.duration || 0,
        isLoaded: true,
      }));
    };

    const onTimeUpdate = () => {
      setState((s) => ({ ...s, currentTime: audio.currentTime }));
    };

    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onEnded = () =>
      setState((s) => ({ ...s, isPlaying: false, currentTime: 0 }));

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  const play = useCallback(() => {
    audioRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setState((s) => ({ ...s, currentTime: time }));
    }
  }, []);

  const getCurrentTime = useCallback(() => {
    return audioRef.current?.currentTime ?? 0;
  }, []);

  return {
    audioRef,
    state,
    play,
    pause,
    togglePlayPause,
    seek,
    getCurrentTime,
  };
}
