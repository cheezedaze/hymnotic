"use client";

import { useEffect } from "react";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { useAudioPlayer } from "@/lib/hooks/useAudioPlayer";
import { useMediaSession } from "@/lib/hooks/useMediaSession";
import { useIsDesktop } from "@/lib/hooks/useIsDesktop";
import { MobileLayout } from "./MobileLayout";
import { DesktopLayout } from "./DesktopLayout";

export function AppShell({ children }: { children: React.ReactNode }) {
  useAudioPlayer();
  useMediaSession();

  // Load server-backed favorites on mount
  useEffect(() => {
    useFavoritesStore.getState().loadFavorites();
  }, []);

  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return <DesktopLayout>{children}</DesktopLayout>;
  }

  return <MobileLayout>{children}</MobileLayout>;
}
