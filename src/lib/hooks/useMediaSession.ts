"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { hasNativeIOSPlayback } from "@/lib/audio/nativeIOSPlayback";
import {
  artworkCandidates,
  pauseAudioFromRemoteControl,
  resolveArtworkUrl,
  resumeAudioFromRemoteControl,
} from "@/lib/audio/mediaSession";

export function useMediaSession() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const nativeIOSPlayback = hasNativeIOSPlayback();

  useEffect(() => {
    if (!nativeIOSPlayback || !("mediaSession" in navigator)) return;

    // Remove the WKWebView media session completely. Leaving even one browser
    // handler registered makes iOS prefer WebKit's generic ±10-second session
    // over the native queued-music session.
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
    for (const action of [
      "play",
      "pause",
      "seekbackward",
      "seekforward",
      "seekto",
      "previoustrack",
      "nexttrack",
    ] as MediaSessionAction[]) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // Older WebKit versions do not expose every Media Session action.
      }
    }
  }, [nativeIOSPlayback]);

  useEffect(() => {
    if (nativeIOSPlayback || !currentTrack || !("mediaSession" in navigator)) {
      return;
    }

    let cancelled = false;
    void resolveArtworkUrl(
      artworkCandidates(
        currentTrack.artworkUrl,
        currentTrack.collectionArtworkUrl
      )
    ).then((artworkUrl) => {
      if (cancelled) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: "",
        artwork: [{ src: new URL(artworkUrl, window.location.href).href }],
      });
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack, nativeIOSPlayback]);

  useEffect(() => {
    if (nativeIOSPlayback || !("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      const store = usePlayerStore.getState();
      resumeAudioFromRemoteControl(store.play, store.pause);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      pauseAudioFromRemoteControl(usePlayerStore.getState().pause);
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
  }, [nativeIOSPlayback]);

  useEffect(() => {
    if (nativeIOSPlayback || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying, nativeIOSPlayback]);
}
