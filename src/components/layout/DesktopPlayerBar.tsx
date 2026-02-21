"use client";

import Image from "next/image";
import { Heart, Share2, Music } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { PlaybackControls } from "@/components/player/PlaybackControls";
import { cn } from "@/lib/utils/cn";

export function DesktopPlayerBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  if (!currentTrack) return null;

  const isFavorited = favoriteIds.includes(currentTrack.id);
  const displayArtwork = currentTrack.artworkUrl || currentTrack.collectionArtworkUrl;

  return (
    <div className="shrink-0 border-t border-white/6 bg-midnight-deep">
      <div className="flex items-center gap-6 px-6 py-3">
        {/* Left: Playback controls */}
        <div className="flex-1 min-w-0">
          <PlaybackControls variant="desktop" />
        </div>

        {/* Right: Track info */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Track artwork */}
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
            {displayArtwork ? (
              <Image
                src={displayArtwork}
                alt={currentTrack.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <Music size={16} className="text-text-dim" />
              </div>
            )}
          </div>

          {/* Track title & artist */}
          <div className="min-w-0 max-w-[180px]">
            <p className="text-sm font-medium text-text-primary truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-text-muted truncate">
              {currentTrack.artist}
            </p>
          </div>

          {/* Share & Favorite */}
          <div className="flex items-center gap-2">
            <button
              className="text-text-muted hover:text-text-secondary transition-colors p-1.5"
              title="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => toggleFavorite(currentTrack.id)}
              className={cn(
                "p-1.5 transition-all",
                isFavorited
                  ? "text-accent drop-shadow-[0_0_6px_rgba(0,255,251,0.4)]"
                  : "text-text-muted hover:text-text-secondary"
              )}
              title="Favorite"
            >
              <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
