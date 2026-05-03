"use client";

import { useEffect } from "react";

/**
 * One-time bootstrap for native (Capacitor) builds. Initializes the social
 * login plugin so the in-app Continue with Google / Apple buttons can use the
 * native account picker instead of the WebView OAuth flow (which Google blocks
 * with `disallowed_useragent`).
 *
 * No-op on the web — only runs inside the iOS/Android Capacitor shell.
 */
export function NativeBootstrap() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      if (cancelled) return;

      await SocialLogin.initialize({
        google: {
          // Web client ID — used as the ID-token audience on Android and Web.
          // Same value as AUTH_GOOGLE_ID on the server.
          webClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          // iOS client ID — used as the ID-token audience on iOS only.
          iOSClientId: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        },
        apple: {},
      });
    })().catch((err) => {
      console.warn("[NativeBootstrap] SocialLogin.initialize failed:", err);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
