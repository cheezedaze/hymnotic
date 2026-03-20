"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, Crown, ExternalLink, Music } from "lucide-react";
import { isNativeApp, openExternalBrowser } from "@/lib/utils/platform";

export default function SubscribePage() {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const [error, setError] = useState("");

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    setError("");
    setLoading(plan);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/auth/register";
          return;
        }
        setError(data.error || "Something went wrong");
        setLoading(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  const freeFeatures = [
    "7 free songs",
    "Access to library",
    "One-minute previews",
    "Save favorites",
  ];

  const premiumFeatures = [
    "Full access to entire catalog",
    "Full-length songs and videos",
    "Unlimited streaming",
    "Favorite and save songs",
    "No voiceover prompts",
    "No sponsor banners",
    "Support sacred music",
  ];

  // On native apps, show a message to visit hymnz.com instead of pricing
  if (isNativeApp()) {
    return (
      <div className="min-h-dvh bg-midnight flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <Image
            src="/images/hymnz-logo1.png"
            alt="HYMNZ"
            width={48}
            height={48}
            className="mx-auto mb-6"
          />
          <h1 className="text-display text-xl font-bold text-text-primary mb-2">
            Unlock Every Hymn
          </h1>
          <p className="text-text-secondary text-sm mb-8 leading-relaxed">
            To subscribe, visit hymnz.com in your browser. Your subscription
            will sync automatically.
          </p>
          <button
            onClick={() => openExternalBrowser("https://hymnz.com/subscribe")}
            className="w-full py-3.5 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 glow-accent"
          >
            <ExternalLink size={16} />
            Open hymnz.com
          </button>
          <Link
            href="/"
            className="block text-text-muted text-sm mt-4 hover:text-text-secondary transition-colors"
          >
            Maybe Later
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-midnight px-6 pt-[calc(2rem+var(--safe-top))] pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-4">
          <Image
            src="/images/hymnz-logo1.png"
            alt="HYMNZ"
            width={48}
            height={48}
            className="mb-3"
          />
          <h1 className="text-display text-2xl font-bold text-text-primary">
            Choose Your Plan
          </h1>
          <p className="text-text-secondary text-sm mt-2 text-center">
            Get full access to our growing catalog of beautifully produced
            sacred music.
          </p>
        </div>

        <p className="text-center text-accent text-xs font-medium tracking-wide uppercase mb-8">
          New content added frequently
        </p>

        {/* Tier cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Free Tier */}
          <div className="glass-heavy rounded-2xl p-6 border border-white/10 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Music size={16} className="text-text-secondary" />
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                Free
              </h2>
            </div>
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-2xl font-bold text-text-primary">$0</span>
              <span className="text-text-muted text-sm">/month</span>
            </div>
            <ul className="space-y-3 mb-6 flex-1">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check size={14} className="text-text-muted shrink-0" />
                  <span className="text-text-secondary text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/auth/register"
              className="block w-full py-3 text-center text-text-primary font-semibold rounded-xl border border-white/20 hover:border-white/40 transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Premium Tier */}
          <div className="glass-heavy rounded-2xl p-6 border border-accent/30 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-midnight text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
              Most Popular
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} className="text-gold" />
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                HYMNZ Premium
              </h2>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold text-accent">$1.99</span>
              <span className="text-text-muted text-sm">/first month</span>
            </div>
            <p className="text-text-dim text-xs mb-5">
              Then $4.99/mo &middot; Cancel anytime
            </p>
            <ul className="space-y-3 mb-6 flex-1">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check size={14} className="text-accent shrink-0" />
                  <span className="text-text-secondary text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Pricing buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleSubscribe("monthly")}
                disabled={!!loading}
                className="w-full py-3 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors glow-accent disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === "monthly" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Start for $1.99"
                )}
              </button>

              <button
                onClick={() => handleSubscribe("yearly")}
                disabled={!!loading}
                className="w-full py-3 text-center text-text-primary font-semibold rounded-xl border border-white/20 hover:border-accent/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 relative"
              >
                {loading === "yearly" ? (
                  <Loader2 size={16} className="animate-spin text-accent" />
                ) : (
                  <>
                    Yearly &mdash; $47.90/yr
                    <span className="text-accent text-xs font-bold ml-1">
                      Save 20%
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        <Link
          href="/"
          className="block text-center text-text-muted text-sm hover:text-text-secondary transition-colors"
        >
          Maybe Later
        </Link>
      </div>
    </div>
  );
}
