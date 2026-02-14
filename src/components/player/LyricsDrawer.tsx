"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { usePlayerStore } from "@/lib/store/playerStore";
import { getLyricsByTrackId, type LyricLine } from "@/lib/data/lyrics";
import { PlaybackControls } from "./PlaybackControls";
import { cn } from "@/lib/utils/cn";

export function LyricsDrawer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const setLyricsOpen = usePlayerStore((s) => s.setLyricsOpen);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const lyrics = currentTrack ? getLyricsByTrackId(currentTrack.id) : [];
  const hasLyrics = lyrics.length > 0;

  // Auto-scroll to active lyric
  useEffect(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentTime]);

  // Don't early-return here — parent controls mounting. AnimatePresence needs
  // the motion.div to stay mounted during exit so the slide-down animation plays.
  const getActiveLineIndex = () => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].startTime) return i;
    }
    return -1;
  };

  const activeIndex = getActiveLineIndex();

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="absolute inset-0 z-50 flex flex-col bg-teal-solid"
    >
      {/* Header with drag handle */}
      <div className="flex-shrink-0 pt-[calc(0.75rem+var(--safe-top))]">
        <button
          onClick={() => setLyricsOpen(false)}
          className="w-full py-3"
        >
          <div className="w-10 h-1 bg-white/30 rounded-full mx-auto" />
        </button>
        <div className="text-center pb-2">
          <span className="glass px-4 py-1.5 rounded-lg text-xs font-medium text-text-secondary">
            Lyrics & Info
          </span>
        </div>
      </div>

      {/* Lyrics content */}
      <div
        ref={lyricsContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide"
      >
        {hasLyrics ? (
          <div className="space-y-4 pb-8">
            {lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;
              return (
                <div
                  key={index}
                  ref={isActive ? activeLineRef : undefined}
                  className={cn(
                    "text-lg leading-relaxed transition-all duration-300 text-display",
                    isActive
                      ? "text-text-primary font-semibold scale-[1.02] origin-left"
                      : isPast
                        ? "text-text-muted"
                        : "text-text-dim",
                    line.isChorus && "italic text-gold/80"
                  )}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-muted text-center">
              No lyrics available for this track.
            </p>
          </div>
        )}
      </div>

      {/* Persistent playback controls */}
      <div className="flex-shrink-0 bg-teal-solid/90 backdrop-blur-lg border-t border-white/10 pb-[var(--safe-bottom)]">
        <div className="pt-2">
          <p className="text-center text-sm font-semibold text-text-primary truncate px-4 mb-1">
            {currentTrack?.title}
          </p>
          <PlaybackControls compact />
        </div>
      </div>
    </motion.div>
  );
}
