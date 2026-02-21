"use client";

import { usePlayerStore } from "@/lib/store/playerStore";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopPlayerBar } from "./DesktopPlayerBar";

export function DesktopLayout({ children }: { children: React.ReactNode }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return (
    <div className="relative min-h-dvh bg-midnight overflow-x-hidden">
      <DesktopSidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="ml-60 flex flex-col h-dvh">
        <main className="flex-1 overflow-y-auto overflow-x-hidden desktop-scrollbar">
          {children}
        </main>

        {/* Persistent player bar */}
        {currentTrack && <DesktopPlayerBar />}
      </div>
    </div>
  );
}
