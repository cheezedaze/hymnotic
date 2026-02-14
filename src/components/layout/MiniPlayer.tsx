"use client";

import Image from "next/image";
import { Play, Pause, Music } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { cn } from "@/lib/utils/cn";

export function MiniPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const expandNowPlaying = usePlayerStore((s) => s.expandNowPlaying);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="glass mx-2 mb-1 rounded-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-white/10">
        <div
          className="h-full bg-accent transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        onClick={expandNowPlaying}
        className="flex items-center gap-3 w-full px-3 py-2 text-left"
      >
        {/* Artwork */}
        {currentTrack.artworkUrl ? (
          <Image
            src={currentTrack.artworkUrl}
            alt={currentTrack.title}
            width={40}
            height={40}
            className="rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            <Music size={16} className="text-text-dim" />
          </div>
        )}

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {currentTrack.title}
          </p>
          <p className="text-xs text-text-muted truncate">
            {currentTrack.artist}
          </p>
        </div>

        {/* Play/Pause */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-colors",
            isPlaying ? "bg-accent-50" : "bg-accent-16"
          )}
        >
          {isPlaying ? (
            <Pause size={16} fill="white" className="text-white" />
          ) : (
            <Play size={16} fill="white" className="text-white ml-0.5" />
          )}
        </div>
      </button>
    </div>
  );
}
