"use client";

import { UserPlus, Sparkles } from "lucide-react";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import { usePlayerStore } from "@/lib/store/playerStore";
import { usePathname, useRouter } from "next/navigation";

export function DesktopVisitorBanner() {
  const tier = useSubscriptionStore((s) => s.effectiveTier());
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);
  const minimizeNowPlaying = usePlayerStore((s) => s.minimizeNowPlaying);
  const pathname = usePathname();
  const router = useRouter();

  // Only show for visitors and free users on desktop
  if (!isLoaded || tier === "paid") return null;
  if (
    pathname === "/auth/register" ||
    pathname === "/subscribe" ||
    pathname.startsWith("/subscription/")
  )
    return null;

  const handleCTA = () => {
    minimizeNowPlaying();
    router.push("/subscribe");
  };

  if (tier === "free") {
    return (
      <div
        className="shrink-0 flex items-center justify-between px-8 py-4"
        style={{
          background: "linear-gradient(to right, #0F5158, #0B1118)",
        }}
      >
        <div className="min-w-0 mr-6">
          <p className="text-gold text-xs font-semibold tracking-wide uppercase mb-1">
            HYMNZ FREE VERSION
          </p>
          <p className="text-text-primary text-sm leading-relaxed">
            Upgrade to HYMNZ Premium to unlock all the music and features!
          </p>
        </div>
        <button
          onClick={handleCTA}
          className="shrink-0 flex items-center gap-2 px-8 py-3 bg-gold/20 hover:bg-gold/30 border border-gold/40 text-gold font-semibold text-sm rounded-full transition-colors whitespace-nowrap"
        >
          <Sparkles size={16} />
          Upgrade to Premium
        </button>
      </div>
    );
  }

  // Visitor tier
  return (
    <div
      className="shrink-0 flex items-center justify-between px-8 py-4"
      style={{
        background: "linear-gradient(to right, #0F5158, #0B1118)",
      }}
    >
      <div className="min-w-0 mr-6">
        <p className="text-gold text-xs font-semibold tracking-wide uppercase mb-1">
          HYMNZ Preview
        </p>
        <p className="text-text-primary text-sm leading-relaxed">
          Get a FREE HYMNZ account&nbsp;&nbsp;to unlock longer previews and 7
          free songs. No Credit Card Required.
        </p>
      </div>
      <button
        onClick={handleCTA}
        className="shrink-0 flex items-center gap-2 px-8 py-3 bg-gold/20 hover:bg-gold/30 border border-gold/40 text-gold font-semibold text-sm rounded-full transition-colors whitespace-nowrap"
      >
        <UserPlus size={16} />
        Create Free Account
      </button>
    </div>
  );
}
