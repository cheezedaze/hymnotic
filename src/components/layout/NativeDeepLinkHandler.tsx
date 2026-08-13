"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { registerNativeTrackLinks } from "@/lib/deep-links/nativeTrackLinks";

export function NativeDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => Promise<void>) | undefined;

    if (Capacitor.isNativePlatform()) {
      void registerNativeTrackLinks(App, {
        currentPath: () => window.location.pathname,
        push: (path) => router.push(path),
      })
        .then(async (registeredCleanup) => {
          if (cancelled) {
            await registeredCleanup();
            return;
          }
          cleanup = registeredCleanup;
        })
        .catch((error: unknown) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[NativeDeepLinkHandler] initialization failed",
              error
            );
          }
        });
    }

    return () => {
      cancelled = true;
      void cleanup?.();
    };
  }, [router]);

  return null;
}
