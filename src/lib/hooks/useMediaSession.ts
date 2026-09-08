"use client";

import { useEffect, useRef } from "react";
import {
  Capacitor,
  type PluginListenerHandle,
  registerPlugin,
} from "@capacitor/core";
import { usePlayerStore } from "@/lib/store/playerStore";
import { getAudioElement } from "@/lib/audio/audioContext";
import {
  artworkCandidates,
  pauseAudioFromRemoteControl,
  resolveArtworkUrl,
  resumeAudioFromRemoteControl,
} from "@/lib/audio/mediaSession";

interface IOSMediaSessionPlugin {
  configure(options: {
    trackId: string;
    title: string;
    artist: string;
    artworkUrl?: string;
    duration: number;
    elapsedTime: number;
    isPlaying: boolean;
    queueCount: number;
    queueIndex: number;
  }): Promise<void>;
  addListener(
    eventName: "remoteCommand",
    listener: (event: {
      command: "play" | "pause" | "next" | "previous";
    }) => void
  ): Promise<PluginListenerHandle>;
}

const IOSMediaSession = registerPlugin<IOSMediaSessionPlugin>(
  "HymnzMediaSession"
);

function hasNativeIOSMediaSession() {
  return (
    Capacitor.getPlatform() === "ios" &&
    Capacitor.isPluginAvailable("HymnzMediaSession")
  );
}

function configureNativeIOSMediaSession(artworkUrl?: string) {
  const store = usePlayerStore.getState();
  const track = store.currentTrack;
  if (!track) return;

  const audio = getAudioElement();
  const duration =
    audio && Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : track.duration;

  void IOSMediaSession.configure({
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    artworkUrl,
    duration,
    elapsedTime: audio?.currentTime ?? store.currentTime,
    isPlaying: audio ? !audio.paused : store.isPlaying,
    queueCount: Math.max(1, store.queue.length),
    queueIndex: Math.max(0, store.currentIndex),
  }).catch(() => {});
}

export function useMediaSession() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const resolvedArtworkUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!currentTrack) return;
    if (!("mediaSession" in navigator) && !hasNativeIOSMediaSession()) return;

    let cancelled = false;
    resolvedArtworkUrl.current = undefined;

    void resolveArtworkUrl(
      artworkCandidates(
        currentTrack.artworkUrl,
        currentTrack.collectionArtworkUrl
      )
    ).then((artworkUrl) => {
      if (cancelled) return;

      const absoluteArtworkUrl = new URL(artworkUrl, window.location.href).href;
      resolvedArtworkUrl.current = absoluteArtworkUrl;

      if (hasNativeIOSMediaSession()) {
        configureNativeIOSMediaSession(absoluteArtworkUrl);
      } else {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: "",
          // Do not claim a MIME type or size. Production contains mixed legacy
          // PNG/JPEG artwork, and incorrect metadata can make iOS cache a blank.
          artwork: [{ src: absoluteArtworkUrl }],
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || hasNativeIOSMediaSession()) return;

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
  }, []);

  useEffect(() => {
    if (!hasNativeIOSMediaSession()) return;

    let listener: PluginListenerHandle | undefined;
    let cancelled = false;

    void IOSMediaSession.addListener(
      "remoteCommand",
      ({ command }) => {
        const store = usePlayerStore.getState();
        if (command === "play") {
          resumeAudioFromRemoteControl(store.play, store.pause);
        }
        if (command === "pause") {
          pauseAudioFromRemoteControl(store.pause);
        }
        if (command === "next") store.next();
        if (command === "previous") store.previous();
      }
    )
      .then((handle) => {
        if (cancelled) {
          void handle.remove();
        } else {
          listener = handle;
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      void listener?.remove();
    };
  }, []);

  // Native iOS owns Now Playing metadata and commands. Sync only at playback
  // transitions; iOS extrapolates elapsed time from the supplied playback rate.
  useEffect(() => {
    if (!hasNativeIOSMediaSession() || !currentTrack) return;

    const audio = getAudioElement();
    const sync = () =>
      configureNativeIOSMediaSession(resolvedArtworkUrl.current);

    audio?.addEventListener("playing", sync);
    audio?.addEventListener("pause", sync);
    audio?.addEventListener("seeked", sync);
    audio?.addEventListener("loadedmetadata", sync);
    sync();

    return () => {
      audio?.removeEventListener("playing", sync);
      audio?.removeEventListener("pause", sync);
      audio?.removeEventListener("seeked", sync);
      audio?.removeEventListener("loadedmetadata", sync);
    };
  }, [currentTrack, isPlaying]);

  // Keep playback state in sync
  useEffect(() => {
    if (!("mediaSession" in navigator) || hasNativeIOSMediaSession()) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);
}
