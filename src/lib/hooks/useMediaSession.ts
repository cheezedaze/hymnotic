"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/lib/store/playerStore";

export function useMediaSession() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: "",
      artwork: currentTrack.artworkUrl
        ? [
            { src: currentTrack.artworkUrl, sizes: "512x512", type: "image/jpeg" },
          ]
        : currentTrack.collectionArtworkUrl
          ? [
              { src: currentTrack.collectionArtworkUrl, sizes: "512x512", type: "image/jpeg" },
            ]
          : [],
    });
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.artworkUrl, currentTrack?.collectionArtworkUrl]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      usePlayerStore.getState().play();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      usePlayerStore.getState().pause();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      usePlayerStore.getState().previous();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      usePlayerStore.getState().next();
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, []);

  // Keep playback state in sync
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);
}
