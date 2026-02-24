"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, Headphones, Share2, Music } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { AlbumArtBackdrop } from "./AlbumArtBackdrop";
import { PlaybackControls } from "./PlaybackControls";
import { LyricsDrawer } from "./LyricsDrawer";
import { MarqueeText } from "./MarqueeText";
import { IconButton } from "@/components/ui/IconButton";

export function NowPlaying() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const minimizeNowPlaying = usePlayerStore((s) => s.minimizeNowPlaying);
  const toggleLyrics = usePlayerStore((s) => s.toggleLyrics);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  if (!currentTrack) return null;

  const isFavorited = favoriteIds.includes(currentTrack.id);

  const displayArtworkUrl = currentTrack.artworkUrl || currentTrack.collectionArtworkUrl;

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0.8 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0.8 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col bg-midnight"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        {currentTrack.videoUrl ? (
          <video
            key={currentTrack.videoUrl}
            src={currentTrack.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-x-0 top-0 bottom-[40%]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                style={{
                  width: "75%",
                  aspectRatio: "1",
                  background:
                    "linear-gradient(135deg, rgba(0,255,251,0.55), rgba(255,242,0,0.35), rgba(0,255,251,0.4))",
                  filter: "blur(2px)",
                  maskImage: "url(/images/hymnz-logo1.png)",
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskImage: "url(/images/hymnz-logo1.png)",
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                }}
              />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/5 via-midnight/25 to-midnight/85 pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+var(--safe-top))] shrink-0">
          <button
            onClick={minimizeNowPlaying}
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronDown size={26} />
          </button>
          <span className="text-display text-sm font-medium text-text-secondary">
            Now Playing
          </span>
          <div className="w-10" />
        </div>

        {/* Spacer - pushes artwork toward bottom */}
        <div className="flex-1 min-h-0" />

        {/* Album artwork - compact, positioned just above controls */}
        <div className="flex items-center justify-center px-16 pb-4 shrink-0">
          <div className="relative w-full max-w-[180px] aspect-square rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
            {displayArtworkUrl ? (
              <Image
                src={displayArtworkUrl}
                alt={currentTrack.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <Music size={36} className="text-text-dim" />
              </div>
            )}
          </div>
        </div>

        {/* Track info */}
        <div className="px-6 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <MarqueeText
                text={currentTrack.title}
                className="text-xl font-bold text-display text-text-primary"
              />
            </div>
            <IconButton
              size="sm"
              label="Favorite"
              active={isFavorited}
              onClick={() => toggleFavorite(currentTrack.id)}
            >
              <Heart size={22} fill={isFavorited ? "currentColor" : "none"} />
            </IconButton>
          </div>
        </div>

        {/* Playback controls */}
        <div className="shrink-0">
          <PlaybackControls />
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between px-6 pb-[calc(1rem+var(--safe-bottom))] shrink-0">
          <IconButton size="sm" label="Audio quality">
            <Headphones size={18} />
          </IconButton>
          <button
            onClick={toggleLyrics}
            className="bg-accent-16 hover:bg-accent-26 text-accent text-sm font-medium px-6 py-2.5 rounded-full transition-colors"
          >
            Lyrics & Info
          </button>
          <IconButton size="sm" label="Share">
            <Share2 size={18} />
          </IconButton>
        </div>
      </div>

      {/* Lyrics drawer */}
      <AnimatePresence>
        {isLyricsOpen && <LyricsDrawer />}
      </AnimatePresence>
    </motion.div>
  );
}
