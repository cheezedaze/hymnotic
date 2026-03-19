"use client";

import { useSubscriptionStore } from "@/lib/store/subscriptionStore";

export function SponsorBanner() {
  const tier = useSubscriptionStore((s) => s.effectiveTier());

  if (tier !== "free") return null;

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
