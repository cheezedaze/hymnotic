"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, Headphones, Share2, Music } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import { AlbumArtBackdrop } from "./AlbumArtBackdrop";
import { PlaybackControls } from "./PlaybackControls";
import { LyricsDrawer } from "./LyricsDrawer";
import { MarqueeText } from "./MarqueeText";
import { PersistentCTA } from "./PersistentCTA";
import { IconButton } from "@/components/ui/IconButton";
import { SponsorBanner } from "@/components/subscription/SponsorBanner";

export function NowPlaying() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const minimizeNowPlaying = usePlayerStore((s) => s.minimizeNowPlaying);
  const toggleLyrics = usePlayerStore((s) => s.toggleLyrics);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const isPreviewMode = usePlayerStore((s) => s.isPreviewMode);

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
          <>
            {/* Collection artwork as blurred, semi-transparent background */}
            {(currentTrack.collectionArtworkUrl || currentTrack.artworkUrl) && (
              <Image
                src={currentTrack.collectionArtworkUrl || currentTrack.artworkUrl!}
                alt=""
                fill
                className="object-cover"
                style={{ opacity: 0.3, filter: "blur(8px)" }}
                priority
              />
            )}
            {/* Logo centered on screen */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[70%] aspect-[900/617]">
                <Image
                  src="/images/logo-bg.png"
                  alt="HYMNZ"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/5 via-midnight/25 to-midnight/85 pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Scrollable upper region */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+var(--safe-top))] shrink-0">
            <button
              onClick={minimizeNowPlaying}
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronDown size={26} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-display text-sm font-medium text-text-secondary">
                Now Playing
              </span>
              {isPreviewMode && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gold bg-gold/15 px-2 py-0.5 rounded-full">
                  Preview
                </span>
              )}
            </div>
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
              {isPremium && (
                <IconButton
                  size="sm"
                  label="Favorite"
                  active={isFavorited}
                  onClick={() => toggleFavorite(currentTrack.id)}
                >
                  <Heart size={22} fill={isFavorited ? "currentColor" : "none"} />
                </IconButton>
              )}
            </div>
          </div>
        </div>

        {/* Fixed bottom region — CTA, controls, actions */}
        <div className="shrink-0">
          {/* Persistent CTA for visitors / free users */}
          <PersistentCTA />

          {/* Sponsor banner for free tier */}
          <SponsorBanner />

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
      </div>

      {/* Lyrics drawer */}
      <AnimatePresence>
        {isLyricsOpen && <LyricsDrawer />}
      </AnimatePresence>
    </motion.div>
  );
}
