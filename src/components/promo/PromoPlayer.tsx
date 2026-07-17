"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import {
  canPlayPromo,
  getPromoListenState,
  markPromoListenUsed,
} from "@/lib/promo/promo-gate";

interface PromoPlayerProps {
  trackId: string;
  title: string;
  artist: string;
  audioUrl: string;
  artworkUrl: string;
  isAuthenticated: boolean;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PromoPlayer({
  trackId,
  title,
  artist,
  audioUrl,
  artworkUrl,
  isAuthenticated,
}: PromoPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reportedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errored, setErrored] = useState(false);
  // null until mounted (localStorage is client-only) to avoid hydration mismatch
  const [gated, setGated] = useState<boolean | null>(null);

  useEffect(() => {
    setGated(!canPlayPromo(isAuthenticated, getPromoListenState(trackId)));
  }, [isAuthenticated, trackId]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioUrl;
    audioRef.current = audio;

    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => {
      setIsPlaying(true);
      if (!reportedRef.current) {
        reportedRef.current = true;
        fetch("/api/promo/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId, source: "another-testament" }),
        }).catch(() => {});
      }
    };
    const onPause = () => setIsPlaying(false);
    const onError = () => setErrored(true);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (!isAuthenticated) {
        markPromoListenUsed(trackId);
        setGated(true);
      }
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, [audioUrl, isAuthenticated, trackId]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || gated !== false) return;
    if (audio.paused) {
      usePlayerStore.getState().pause();
      audio.play().catch(() => setErrored(true));
    } else {
      audio.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || gated !== false) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  return (
    <div className="glass-heavy rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden">
          <Image src={artworkUrl} alt={title} fill className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-display text-lg font-semibold text-text-primary truncate">
            {title}
          </p>
          <p className="text-text-muted text-sm">{artist}</p>
        </div>
        <button
          onClick={togglePlay}
          disabled={gated === true}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="w-14 h-14 shrink-0 rounded-full bg-accent text-midnight flex items-center justify-center glow-accent disabled:opacity-40 disabled:shadow-none"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" fill="currentColor" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-text-dim text-xs tabular-nums">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 242}
          value={currentTime}
          onChange={seek}
          disabled={gated === true}
          className="flex-1 accent-[#00FFFB] h-1 py-3 -my-3"
          aria-label="Seek"
        />
        <span className="text-text-dim text-xs tabular-nums">
          {formatTime(duration || 242)}
        </span>
      </div>

      {errored ? (
        <div className="mt-4 rounded-xl bg-accent-dim border border-accent-26 p-4 text-center">
          <p className="text-text-secondary text-sm">
            Couldn&apos;t load the audio.{" "}
            <Link href="/" className="text-accent hover:underline">
              Listen on HYMNZ
            </Link>
          </p>
        </div>
      ) : gated === true && (
        <div className="mt-4 rounded-xl bg-accent-dim border border-accent-26 p-4 text-center">
          <p className="text-text-primary text-sm font-medium">
            Hope you enjoyed your free listen.
          </p>
          <p className="text-text-secondary text-sm mt-1">
            Create a free account to listen again — and explore more sacred
            arrangements.
          </p>
          <Link
            href="/auth/register"
            className="inline-block mt-3 px-6 py-2.5 rounded-full bg-accent text-midnight text-sm font-semibold glow-accent"
          >
            Create free account
          </Link>
          <p className="text-text-dim text-xs mt-2">
            Already have one?{" "}
            <Link href="/auth/signin" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
