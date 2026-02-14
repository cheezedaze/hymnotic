"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, Headphones, Share2, Music } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
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

  if (!currentTrack) return null;

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0.8 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0.8 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col bg-midnight"
    >
      {/* Backdrop */}
      <AlbumArtBackdrop src={currentTrack.artworkUrl || ""} alt={currentTrack.title} />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+var(--safe-top))]">
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

        {/* Album artwork */}
        <div className="flex-1 flex items-center justify-center px-10 py-4">
          <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
            {currentTrack.artworkUrl ? (
              <Image
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <Music size={48} className="text-text-dim" />
              </div>
            )}
          </div>
        </div>

        {/* Track info */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <MarqueeText
                text={currentTrack.title}
                className="text-xl font-bold text-display text-text-primary"
              />
            </div>
            <IconButton size="sm" label="Favorite">
              <Heart size={22} />
            </IconButton>
          </div>
        </div>

        {/* Playback controls */}
        <PlaybackControls />

        {/* Bottom actions */}
        <div className="flex items-center justify-between px-6 pb-[calc(1rem+var(--safe-bottom))]">
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
