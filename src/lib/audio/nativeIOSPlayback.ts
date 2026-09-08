import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";
import type { ApiTrack } from "@/lib/types";

export interface NativePlaybackTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  artworkUrl?: string;
  duration: number;
  previewLimit?: number;
}

export interface NativePlaybackState {
  trackId?: string;
  queueIndex: number;
  queueCount: number;
  position: number;
  duration: number;
  isPlaying: boolean;
  reason:
    | "loaded"
    | "play"
    | "pause"
    | "next"
    | "previous"
    | "ended"
    | "previewEnded"
    | "time"
    | "error";
}

interface NativeIOSPlaybackPlugin {
  loadQueue(options: {
    tracks: NativePlaybackTrack[];
    queueIndex: number;
    position: number;
    isPlaying: boolean;
    repeat: "off" | "all" | "one";
  }): Promise<NativePlaybackState>;
  play(): Promise<NativePlaybackState>;
  pause(): Promise<NativePlaybackState>;
  seek(options: { position: number }): Promise<NativePlaybackState>;
  getState(): Promise<NativePlaybackState>;
  addListener(
    eventName: "playbackState",
    listener: (state: NativePlaybackState) => void
  ): Promise<PluginListenerHandle>;
}

export const NativeIOSPlayback = registerPlugin<NativeIOSPlaybackPlugin>(
  "HymnzMediaSession"
);

export function hasNativeIOSPlayback(): boolean {
  return (
    Capacitor.getPlatform() === "ios" &&
    Capacitor.isPluginAvailable("HymnzMediaSession")
  );
}

function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return new URL(url, window.location.href).href;
}

export function nativePlaybackTracks(tracks: ApiTrack[]): NativePlaybackTrack[] {
  return tracks.flatMap((track) => {
    const audioUrl = absoluteUrl(track.audioUrl);
    if (!audioUrl) return [];

    return [
      {
        id: track.id,
        title: track.title,
        artist: track.artist || "HYMNZ",
        audioUrl,
        artworkUrl:
          absoluteUrl(track.artworkUrl) ??
          absoluteUrl(track.collectionArtworkUrl) ??
          absoluteUrl("/images/album-all-tracks.jpg"),
        duration:
          Number.isFinite(track.duration) && track.duration > 0
            ? track.duration
            : track.previewDuration ?? 0,
        previewLimit: track.isLocked ? track.previewDuration : undefined,
      },
    ];
  });
}
