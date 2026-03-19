"use client";

import { UserPlus, Sparkles, ExternalLink } from "lucide-react";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import { usePlayerStore } from "@/lib/store/playerStore";
import { isNativeApp, openExternalBrowser } from "@/lib/utils/platform";
import { usePathname, useRouter } from "next/navigation";

export function PersistentCTA() {
  const tier = useSubscriptionStore((s) => s.effectiveTier());
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);
  const minimizeNowPlaying = usePlayerStore((s) => s.minimizeNowPlaying);
  const pathname = usePathname();
  const router = useRouter();

  // Don't show on the register page
  if (pathname === "/auth/register" || pathname === "/subscribe") return null;

  // Only show for visitors and free users
  if (!isLoaded || tier === "paid") return null;

  if (tier === "visitor") {
    // On desktop, the DesktopVisitorBanner handles this — only show on mobile
    const handleCreateAccount = () => {
      minimizeNowPlaying();
      router.push("/subscribe");
    };

    return (
      <div className="px-6 pb-2 shrink-0 md:hidden">
        <button
          onClick={handleCreateAccount}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gold/15 hover:bg-gold/25 border border-gold/25 text-gold font-semibold text-sm rounded-xl transition-colors"
        >
          <UserPlus size={16} />
          Create Free Account
        </button>
      </div>
    );
  }

  // Free tier
  const handleSubscribe = () => {
    if (isNativeApp()) {
      openExternalBrowser("https://hymnz.com/subscribe");
    } else {
      window.location.href = "/subscribe";
    }
  };

  return (
    <div className="px-6 pb-2 shrink-0">
      <button
        onClick={handleSubscribe}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gold/15 hover:bg-gold/25 border border-gold/25 text-gold font-semibold text-sm rounded-xl transition-colors"
      >
        {isNativeApp() ? <ExternalLink size={16} /> : <Sparkles size={16} />}
        Upgrade to Premium
      </button>
    </div>
  );
}
