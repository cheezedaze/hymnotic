"use client";

import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import { useRotatingBannerAd } from "@/lib/hooks/useActiveBannerAds";

export function SponsorBanner() {
  const tier = useSubscriptionStore((s) => s.effectiveTier());
  const { currentBannerAd } = useRotatingBannerAd(30000);

  if (tier !== "free") return null;

  // If we have a banner ad image, show it
  if (currentBannerAd) {
    const Wrapper = currentBannerAd.linkUrl ? "a" : "div";
    const linkProps = currentBannerAd.linkUrl
      ? {
          href: currentBannerAd.linkUrl,
          target: "_blank" as const,
          rel: "noopener noreferrer",
        }
      : {};

    return (
      <div className="px-6 pb-2">
        <div className="rounded-xl overflow-hidden">
          <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1 text-center">
            Sponsored
          </p>
          <Wrapper {...linkProps} className="block w-full">
            <img
              src={currentBannerAd.imageUrl}
              alt={currentBannerAd.title}
              className="w-full h-auto object-cover rounded-xl"
            />
          </Wrapper>
        </div>
      </div>
    );
  }

  // Fallback: text-based sponsor link
  return (
    <div className="px-6 pb-2">
      <a
        href="https://artvue.io"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-xl overflow-hidden bg-white/5 border border-white/10 p-3 text-center transition-colors hover:bg-white/[0.07]"
      >
        <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
          Brought to you by
        </p>
        <p className="text-sm font-semibold text-text-secondary">artvue.io</p>
      </a>
    </div>
  );
}
