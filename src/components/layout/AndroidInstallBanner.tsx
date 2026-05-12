"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { isNativeApp } from "@/lib/utils/platform";
import { detectPlatform, isInAppBrowser } from "@/lib/utils/userAgent";

const DISMISS_KEY = "hymnz_android_banner_dismissed_at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function AndroidInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const pkg = process.env.NEXT_PUBLIC_ANDROID_PACKAGE;
    if (!pkg) return;
    if (isNativeApp()) return;

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (detectPlatform(ua) !== "android") return;
    if (isInAppBrowser(ua)) return;

    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const dismissedAt = Number(raw);
        if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_TTL_MS) {
          return;
        }
      }
    } catch {
      // localStorage unavailable — show banner
    }

    setVisible(true);
  }, []);

  if (!visible) return null;

  const pkg = process.env.NEXT_PUBLIC_ANDROID_PACKAGE;
  const storeUrl = `https://play.google.com/store/apps/details?id=${pkg}`;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[55] flex items-center gap-3 px-3 py-2 glass border-b border-white/10"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      role="banner"
      aria-label="Install HYMNZ app"
    >
      <button
        onClick={handleDismiss}
        className="p-1 -ml-1 rounded text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Dismiss app install banner"
      >
        <X size={18} />
      </button>

      <Image
        src="/images/hymnz-logo1.png"
        alt=""
        width={36}
        height={36}
        className="rounded-md flex-shrink-0"
      />

      <div className="flex-1 min-w-0 leading-tight">
        <div className="text-sm font-semibold text-text-primary">HYMNZ</div>
        <div className="text-xs text-text-secondary truncate">
          Open in the app
        </div>
      </div>

      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 px-3 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-xs font-semibold uppercase tracking-wide hover:bg-gold/30 transition-colors"
      >
        Open
      </a>
    </div>
  );
}
