"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { connectTrackLinks } from "@/lib/deep-links/native";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useShareStore } from "@/lib/store/shareStore";

export function NativeDeepLinks() {
  const router = useRouter();
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("App")) return;
    let cancelled = false;
    let disconnect: (() => void) | undefined;
    const navigate = (path: string) => {
      usePlayerStore.getState().minimizeNowPlaying();
      useShareStore.getState().closeShare();
      if (window.location.pathname !== path) router.push(path);
    };
    void (async () => {
      const { App } = await import("@capacitor/app");
      if (cancelled) return;
      disconnect = connectTrackLinks(App, navigate);
    })().catch(() => console.warn("HYMNZ could not initialize app links."));
    return () => { cancelled = true; disconnect?.(); };
  }, [router]);
  return null;
}
