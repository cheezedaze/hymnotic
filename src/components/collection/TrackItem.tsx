"use client";

import Image from "next/image";
import { Play, Heart, Video, Music } from "lucide-react";
import { type ApiTrack } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { WaveformIcon } from "@/components/player/WaveformIcon";
import { cn } from "@/lib/utils/cn";

interface TrackItemProps {
  track: ApiTrack;
  queue: ApiTrack[];
}

function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return n.toLocaleString();
}

export function TrackItem({ track, queue }: TrackItemProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const isActive = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;
  const isFavorited = favoriteIds.includes(track.id);

  const handlePlay = () => {
    playTrack(track, queue);
  };

  return (
    <button
      onClick={handlePlay}
      className={cn(
        "flex items-center gap-3 w-full px-5 py-3 text-left transition-colors border-b border-white/5",
        isActive ? "bg-accent-dim" : "hover:bg-white/[0.03] active:bg-white/[0.06]"
      )}
    >
      {/* Thumbnail / Waveform */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        {(track.artworkUrl || track.collectionArtworkUrl) ? (
          <Image
            src={(track.artworkUrl || track.collectionArtworkUrl)!}
            alt={track.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <Music size={16} className="text-text-dim" />
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 bg-midnight/70 flex items-center justify-center">
            <WaveformIcon active={isCurrentlyPlaying} />
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold truncate",
            isActive ? "text-accent" : "text-text-primary"
          )}
        >
          {track.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {(track.userPlayCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Play size={10} className="opacity-60" />
              {formatCount(track.userPlayCount!)}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Heart size={10} className="opacity-60" />
            {formatCount(track.favoriteCount)}
          </span>
          {track.hasVideo && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Video size={10} className="opacity-60" />
              {formatCount(track.videoCount)}
            </span>
          )}
        </div>
      </div>

      {/* Music note for active track with video */}
      {isActive && track.hasVideo && (
        <span className="text-accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
          </svg>
        </span>
      )}

      {/* Favorite button */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(track.id);
        }}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all",
          isFavorited
            ? "text-accent drop-shadow-[0_0_6px_rgba(0,255,251,0.4)]"
            : "text-text-muted hover:text-text-secondary"
        )}
      >
        <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
      </div>
    </button>
  );
}
