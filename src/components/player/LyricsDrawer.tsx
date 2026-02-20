"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useDragControls, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { usePlayerStore } from "@/lib/store/playerStore";
import { type ApiLyricLine } from "@/lib/types";
import { PlaybackControls } from "./PlaybackControls";
import { cn } from "@/lib/utils/cn";

export function LyricsDrawer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const setLyricsOpen = usePlayerStore((s) => s.setLyricsOpen);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 300], [1, 0.3]);

  // Track whether the lyrics container is scrolled to top
  const isAtTopRef = useRef(true);
  const touchStartYRef = useRef(0);
  const isDraggingFromContentRef = useRef(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      setLyricsOpen(false);
    }
  };

  // Allow swiping down from the lyrics content when scrolled to top
  const handleContentPointerDown = useCallback((e: React.PointerEvent) => {
    const container = lyricsContainerRef.current;
    if (container && container.scrollTop <= 0) {
      isAtTopRef.current = true;
      touchStartYRef.current = e.clientY;
    } else {
      isAtTopRef.current = false;
    }
  }, []);

  const handleContentPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isAtTopRef.current) return;

    const deltaY = e.clientY - touchStartYRef.current;
    // Only initiate drag if swiping downward and at top of scroll
    if (deltaY > 10 && !isDraggingFromContentRef.current) {
      const container = lyricsContainerRef.current;
      if (container && container.scrollTop <= 0) {
        isDraggingFromContentRef.current = true;
        // Prevent scroll and start the drag
        container.style.overflowY = "hidden";
        dragControls.start(e);
      }
    }
  }, [dragControls]);

  const handleContentPointerUp = useCallback(() => {
    if (isDraggingFromContentRef.current) {
      isDraggingFromContentRef.current = false;
      const container = lyricsContainerRef.current;
      if (container) {
        container.style.overflowY = "auto";
      }
    }
    isAtTopRef.current = true;
  }, []);

  const [lyrics, setLyrics] = useState<ApiLyricLine[]>([]);

  // Fetch lyrics from API when track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics([]);
      return;
    }

    let cancelled = false;
    fetch(`/api/tracks/${currentTrack.id}/lyrics`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setLyrics(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setLyrics([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id]);

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
      style={{ y: dragY, opacity: backdropOpacity }}
      drag="y"
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      dragListener={false}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 z-50 flex flex-col bg-teal-solid"
    >
      {/* Header with drag handle - swipe down to dismiss */}
      <div
        className="flex-shrink-0 pt-[calc(0.75rem+var(--safe-top))] touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
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
        onPointerDown={handleContentPointerDown}
        onPointerMove={handleContentPointerMove}
        onPointerUp={handleContentPointerUp}
        onPointerCancel={handleContentPointerUp}
      >
        {hasLyrics ? (
          <div className="space-y-4 pb-8">
            {lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;
              return (
                <div
                  key={line.id || index}
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
