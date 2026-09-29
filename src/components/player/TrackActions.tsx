"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/lib/store/playerStore";
import { recomputeTrackAccess, useSubscriptionStore } from "@/lib/store/subscriptionStore";
import { stopVoiceover } from "@/lib/audio/voiceoverContext";
import type { ApiTrack } from "@/lib/types";
import { getOrCreateAudioElement } from "@/lib/audio/audioContext";
import { hasNativeIOSPlayback } from "@/lib/audio/nativeIOSPlayback";
import { trackPath } from "@/lib/deep-links/urls";

interface Props {
  trackId: string;
  onComplete?: (message: string) => void;
  navigate?: boolean;
}

export function TrackActions({ trackId, onComplete, navigate = false }: Props) {
  const router = useRouter();
  const isPlaying = usePlayerStore((state) => state.isPlaying && !!state.currentTrack);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [track, setTrack] = useState<ApiTrack | null>(null);
  const inFlight = useRef(false);

  const loadTrack = useCallback(async (signal?: AbortSignal) => {
    setError(""); setTrack(null);
    try {
      // Metadata only: showing a button never requests audio or consumes a listen.
      const response = await fetch(`/api/tracks/${encodeURIComponent(trackId)}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error(response.status === 404 ? "This track is no longer available." : "Could not load this track. Please try again.");
      const data: ApiTrack = await response.json();
      if (!data.audioUrl) throw new Error("This track has no playable audio yet.");
      if (!signal?.aborted) setTrack(data);
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : "Could not load this track. Please try again.");
    }
  }, [trackId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadTrack(controller.signal);
    return () => controller.abort();
  }, [loadTrack]);

  const select = async (playNow: boolean) => {
    if (inFlight.current || !track || track.id !== trackId) return;
    inFlight.current = true;
    setBusy(true); setError(""); setMessage("");
    try {
      const subscription = useSubscriptionStore.getState();
      const playable = subscription.isAdmin && subscription.viewAsOverride
        ? recomputeTrackAccess([track], subscription.effectiveTier(), subscription.sacred7TrackIds)[0]
        : track;
      const state = usePlayerStore.getState();
      const alreadyCurrent = state.currentTrack?.id === track.id;
      if (playNow) stopVoiceover();
      if (playNow) {
        // Flush the player's source change and call play in the original tap.
        // Safari otherwise loses user activation across an asynchronous fetch.
        flushSync(() => state.insertTrack(playable, true));
        if (!hasNativeIOSPlayback()) await getOrCreateAudioElement().play();
      } else {
        state.insertTrack(playable, false);
      }
      const confirmation = playNow ? `Playing ${track.title}` : alreadyCurrent ? `${track.title} is already the current song` : `${track.title} added to Up Next`;
      setMessage(confirmation);
      onComplete?.(confirmation);
      if (navigate) router.push(trackPath(track.id));
    } catch (err) {
      if (playNow && usePlayerStore.getState().currentTrack?.id === track.id) usePlayerStore.getState().pause();
      setError(err instanceof Error ? err.message : "Could not load this track. Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return <div className="space-y-2">
    <button type="button" onClick={() => select(true)} disabled={busy || !track}
      className="w-full py-3 bg-accent/15 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors disabled:opacity-50">
      Play Now
    </button>
    {isPlaying && <button type="button" onClick={() => select(false)} disabled={busy || !track}
      className="w-full py-3 border border-accent/25 text-accent rounded-xl text-sm font-medium hover:bg-accent/10 transition-colors disabled:opacity-50">
      Add to Up Next
    </button>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {error && !track && <button type="button" onClick={() => loadTrack()} className="text-sm text-accent">Try again</button>}
    {!error && (!track || busy) && <p role="status" className="text-xs text-text-muted">Loading…</p>}
    {message && <p role="status" className="text-sm text-accent">{message}</p>}
  </div>;
}
