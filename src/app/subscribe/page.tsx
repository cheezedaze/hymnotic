"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Crown, ExternalLink, Music } from "lucide-react";
import { isNativeApp, openExternalLinkAccount } from "@/lib/utils/platform";

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-midnight" />}>
      <SubscribePageInner />
    </Suspense>
  );
}

function SubscribePageInner() {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const [error, setError] = useState("");
  const [tier, setTier] = useState<"visitor" | "free" | "paid">("visitor");
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan");
  const preselectedPlan: "monthly" | "yearly" | null =
    rawPlan === "monthly" || rawPlan === "yearly" ? rawPlan : null;

  useEffect(() => {
    fetch("/api/user/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tier) setTier(data.tier);
      })
      .catch(() => {});
  }, []);

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
          const next = encodeURIComponent(`/subscribe?plan=${plan}`);
          window.location.href = `/auth/register?next=${next}`;
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

  // On native apps, show premium benefits without pricing (reader app compliance)
  if (isNativeApp()) {
    const nativePremiumBenefits = [
      "Full access to our entire catalog of sacred music",
      "Full-length songs and videos — no previews",
      "Unlimited streaming with no interruptions",
      "No voiceover prompts or sponsor banners",
      "Support the creation of sacred music",
    ];

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
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown size={18} className="text-gold" />
            <h1 className="text-display text-xl font-bold text-text-primary">
              HYMNZ Premium
            </h1>
          </div>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            Unlock the full HYMNZ experience with a premium subscription.
          </p>

          <div className="glass-heavy rounded-2xl p-5 mb-6 text-left">
            <ul className="space-y-3">
              {nativePremiumBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <Check size={14} className="text-accent shrink-0 mt-0.5" />
                  <span className="text-text-secondary text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => openExternalLinkAccount("https://www.hymnz.com/subscribe")}
            className="w-full py-3.5 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 glow-accent"
          >
            <ExternalLink size={16} />
            Learn More on hymnz.com
          </button>
          <p className="text-text-dim text-xs mt-3">
            Your subscription will sync automatically to this app.
          </p>
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
            {tier === "free" ? (
              <div className="w-full py-3 text-center text-accent font-semibold rounded-xl border border-accent/30 bg-accent/8">
                Current Plan
              </div>
            ) : tier === "paid" ? (
              <div className="w-full py-3 text-center text-text-muted font-semibold rounded-xl border border-white/10">
                &mdash;
              </div>
            ) : (
              <Link
                href="/auth/register"
                className="block w-full py-3 text-center text-text-primary font-semibold rounded-xl border border-white/20 hover:border-white/40 transition-colors"
              >
                Get Started
              </Link>
            )}
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
              Then $3.99/mo &middot; Cancel anytime
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
              {tier === "paid" ? (
                <div className="w-full py-3 text-center text-accent font-semibold rounded-xl border border-accent/30 bg-accent/8">
                  Current Plan
                </div>
              ) : (
                (() => {
                  const showSelection =
                    preselectedPlan !== null && tier === "free";
                  const monthlySelected =
                    showSelection && preselectedPlan === "monthly";
                  const yearlySelected =
                    showSelection && preselectedPlan === "yearly";

                  const monthlyBtn = (
                    <button
                      key="monthly"
                      onClick={() => handleSubscribe("monthly")}
                      disabled={!!loading}
                      className={`w-full py-3 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors glow-accent disabled:opacity-50 flex items-center justify-center gap-2 ${
                        monthlySelected ? "ring-2 ring-accent" : ""
                      }`}
                    >
                      {loading === "monthly" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          {monthlySelected && <Check size={14} />}
                          Start for $1.99
                        </>
                      )}
                    </button>
                  );

                  const yearlyBtn = (
                    <button
                      key="yearly"
                      onClick={() => handleSubscribe("yearly")}
                      disabled={!!loading}
                      className={`w-full py-3 text-center text-text-primary font-semibold rounded-xl border transition-colors disabled:opacity-50 flex items-center justify-center gap-2 relative ${
                        yearlySelected
                          ? "border-accent ring-2 ring-accent"
                          : "border-white/20 hover:border-accent/30"
                      }`}
                    >
                      {loading === "yearly" ? (
                        <Loader2 size={16} className="animate-spin text-accent" />
                      ) : (
                        <>
                          {yearlySelected && <Check size={14} className="text-accent" />}
                          Yearly &mdash; $38.30/yr
                          <span className="text-accent text-xs font-bold ml-1">
                            Save 20%
                          </span>
                        </>
                      )}
                    </button>
                  );

                  return yearlySelected
                    ? [yearlyBtn, monthlyBtn]
                    : [monthlyBtn, yearlyBtn];
                })()
              )}
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

        {/* Auto-renewal disclosure and legal links */}
        <p className="text-text-dim text-xs text-center mt-6 leading-relaxed max-w-md mx-auto">
          Payment will be charged to your Apple ID account at confirmation of
          purchase. Subscriptions automatically renew unless auto-renew is
          turned off at least 24 hours before the end of the current period.
          Your account will be charged for renewal within 24 hours prior to the
          end of the current period. You can manage and cancel your
          subscriptions by going to your account settings on the App Store
          after purchase.{" "}
          <Link href="/terms" className="text-text-muted hover:text-accent underline">
            Terms of Service
          </Link>
          {" "}&middot;{" "}
          <Link href="/privacy" className="text-text-muted hover:text-accent underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
