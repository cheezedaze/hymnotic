"use client";

import { usePlayerStore } from "@/lib/store/playerStore";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import { NavBar } from "./NavBar";
import { MiniPlayer } from "./MiniPlayer";
import { NowPlaying } from "@/components/player/NowPlaying";
import { PersistentCTA } from "@/components/player/PersistentCTA";
import { PageTransition } from "./PageTransition";
import { AnimatePresence } from "framer-motion";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const isMiniPlayerVisible = usePlayerStore((s) => s.isMiniPlayerVisible);
  const isNowPlayingExpanded = usePlayerStore((s) => s.isNowPlayingExpanded);
  const tier = useSubscriptionStore((s) => s.effectiveTier());
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);

  const showMiniPlayer = isMiniPlayerVisible && !isNowPlayingExpanded;
  const showCTA = isLoaded && tier !== "paid";

  // Extra bottom padding when CTA is visible (~3rem for the gold button)
  const getPadding = () => {
    if (showMiniPlayer && showCTA) return "pb-[calc(12rem+var(--safe-bottom))]";
    if (showMiniPlayer) return "pb-[calc(9rem+var(--safe-bottom))]";
    if (showCTA) return "pb-[calc(9rem+var(--safe-bottom))]";
    return "pb-[calc(6rem+var(--safe-bottom))]";
  };

  return (
    <>
      <main className={getPadding()}>
        {children}
      </main>

      {/* Slide-in overlay for page transitions */}
      <PageTransition />

      {/* Bottom bar area - separate blur layer so backdrop-filter works reliably */}
      <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl px-2 pt-2 pb-[var(--safe-bottom)]">
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
          <PersistentCTA />
          {showMiniPlayer && <MiniPlayer />}
          <NavBar />
        </div>
      </div>

      {/* Now Playing overlay */}
      <AnimatePresence>
        {isNowPlayingExpanded && <NowPlaying />}
      </AnimatePresence>
    </>
  );
}
