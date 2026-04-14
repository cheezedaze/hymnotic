"use client";

import { Crown, Sparkles } from "lucide-react";
import { isNativeApp, openExternalLinkAccount } from "@/lib/utils/platform";
import { SubscribeCTA } from "./SubscribeCTA";

interface SubscriptionCardProps {
  isPremium: boolean;
  accountTier: string;
  subscriptionStatus: string | null;
}

export function SubscriptionCard({
  isPremium,
  accountTier,
  subscriptionStatus,
}: SubscriptionCardProps) {
  const handleManage = async () => {
    if (isNativeApp()) {
      openExternalLinkAccount("https://www.hymnz.com/subscribe");
      return;
    }

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } catch {
      // Fallback to subscribe page
      window.location.href = "/subscribe";
    }
  };

  if (isPremium) {
    return (
      <div className="glass-heavy rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-gold" />
          <h2 className="text-sm font-semibold text-text-primary">
            Premium Subscription
          </h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">Status</p>
            <p className="text-xs text-text-dim">
              Full access to all hymns
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-green-500/15 text-green-400 rounded-lg capitalize">
            {subscriptionStatus || "active"}
          </span>
        </div>
        <button
          onClick={handleManage}
          className="w-full py-2.5 bg-white/5 border border-white/10 text-text-secondary text-sm font-medium rounded-xl hover:bg-white/10 transition-colors"
        >
          Manage Subscription
        </button>
      </div>
    );
  }

  return (
    <div className="glass-heavy rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h2 className="text-sm font-semibold text-text-primary">
          {accountTier === "free" ? "Free Account" : "Subscription"}
        </h2>
      </div>
      <p className="text-sm text-text-muted leading-relaxed">
        Upgrade to Premium for unlimited access to every hymn with no
        interruptions.
      </p>
      <SubscribeCTA />
    </div>
  );
}
