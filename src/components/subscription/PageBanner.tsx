"use client";

import { usePathname } from "next/navigation";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import { useRotatingBannerAd } from "@/lib/hooks/useActiveBannerAds";

export function PageBanner() {
  const pathname = usePathname();
  const tier = useSubscriptionStore((s) => s.effectiveTier());
  const { currentBannerAd, isLoading } = useRotatingBannerAd(30000);

  // Hide on home page, for non-free users, or when no banners
  if (pathname === "/" || tier !== "free" || isLoading || !currentBannerAd)
    return null;

  const Wrapper = currentBannerAd.linkUrl ? "a" : "div";
  const linkProps = currentBannerAd.linkUrl
    ? {
        href: currentBannerAd.linkUrl,
        target: "_blank" as const,
        rel: "noopener noreferrer",
      }
    : {};

  return (
    <div className="mx-4 mt-3">
      <Wrapper
        {...linkProps}
        className="block w-full rounded-xl overflow-hidden"
      >
        <img
          src={currentBannerAd.imageUrl}
          alt={currentBannerAd.title}
          className="w-full h-auto object-cover rounded-xl"
          loading="lazy"
        />
      </Wrapper>
    </div>
  );
}
