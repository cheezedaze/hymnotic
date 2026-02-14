"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useAudioPlayer } from "@/lib/hooks/useAudioPlayer";
import { NavBar } from "./NavBar";
import { MiniPlayer } from "./MiniPlayer";
import { NowPlaying } from "@/components/player/NowPlaying";
import { AnimatePresence } from "framer-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  // #region agent log
  useEffect(() => {
    fetch("/api/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "AppShell.tsx:mount",
        message: "AppShell mounted",
        data: { phase: "before_useAudioPlayer" },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
  }, []);
  // #endregion
  useAudioPlayer();

  const isMiniPlayerVisible = usePlayerStore((s) => s.isMiniPlayerVisible);
  const isNowPlayingExpanded = usePlayerStore((s) => s.isNowPlayingExpanded);

  const showMiniPlayer = isMiniPlayerVisible && !isNowPlayingExpanded;

  return (
    <div className="relative min-h-dvh bg-midnight">
      <main className={showMiniPlayer ? "pb-36" : "pb-24"}>{children}</main>

      {/* Bottom bar area - separate blur layer so backdrop-filter works reliably */}
      <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl px-2 pt-2 pb-[calc(0.5rem+var(--safe-bottom))]">
        {/* Blur layer - sits behind nav content, blurs main content */}
        <div
          className="absolute inset-0 rounded-t-2xl"
          style={{
            background: "rgba(20, 26, 36, 0.60)",
            WebkitBackdropFilter: "blur(23.4px)",
            backdropFilter: "blur(23.4px)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            transform: "translateZ(0)",
          }}
          aria-hidden
        />
        <div className="relative z-10">
          {showMiniPlayer && <MiniPlayer />}
          <NavBar />
        </div>
      </div>

      {/* Now Playing overlay */}
      <AnimatePresence>
        {isNowPlayingExpanded && <NowPlaying />}
      </AnimatePresence>
    </div>
  );
}
