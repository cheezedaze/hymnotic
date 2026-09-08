"use client";

import { useEffect } from "react";
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
  configure(): Promise<void>;
  addListener(
    eventName: "remoteTrackCommand",
    listener: (event: { command: "next" | "previous" }) => void
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

function configureNativeIOSMediaSession() {
  void IOSMediaSession.configure().catch(() => {});
}

export function useMediaSession() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

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
        // Do not claim a MIME type or size. Production contains mixed legacy
        // PNG/JPEG artwork, and incorrect metadata can make iOS cache a blank.
        artwork: [{ src: artworkUrl }],
      });

      if (hasNativeIOSMediaSession()) {
        configureNativeIOSMediaSession();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      const store = usePlayerStore.getState();
      resumeAudioFromRemoteControl(store.play, store.pause);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      pauseAudioFromRemoteControl(usePlayerStore.getState().pause);
    });

    // The native iOS bridge owns these two commands so it can disable WebKit's
    // ±10-second buttons and expose real previous/next track controls.
    if (!hasNativeIOSMediaSession()) {
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        usePlayerStore.getState().previous();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        usePlayerStore.getState().next();
      });
    }

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      if (!hasNativeIOSMediaSession()) {
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasNativeIOSMediaSession()) return;

    let listener: PluginListenerHandle | undefined;
    let cancelled = false;

    void IOSMediaSession.addListener(
      "remoteTrackCommand",
      ({ command }) => {
        const store = usePlayerStore.getState();
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

  // Reassert the native command layout once WebKit actually starts the media;
  // that transition can otherwise restore its default seek buttons.
  useEffect(() => {
    if (!hasNativeIOSMediaSession() || !currentTrack) return;

    const audio = getAudioElement();
    audio?.addEventListener("playing", configureNativeIOSMediaSession);
    configureNativeIOSMediaSession();

    return () => {
      audio?.removeEventListener("playing", configureNativeIOSMediaSession);
    };
  }, [currentTrack]);

  // Keep playback state in sync
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);
}
