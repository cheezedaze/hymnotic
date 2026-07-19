"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Crown, ExternalLink, Music, CheckCircle } from "lucide-react";
import {
  isNativeApp,
  openExternalLinkAccountWithHandoff,
} from "@/lib/utils/platform";

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
  const [tierResolved, setTierResolved] = useState(false);
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan");
  const preselectedPlan: "monthly" | "yearly" | null =
    rawPlan === "monthly" || rawPlan === "yearly" ? rawPlan : null;
  const autoCheckout = searchParams.get("checkout") === "1";
  const welcome = searchParams.get("welcome") === "1";

  useEffect(() => {
    fetch("/api/user/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tier) setTier(data.tier);
      })
      .catch(() => {})
      .finally(() => setTierResolved(true));
  }, []);

  // Any checkout start (manual tap or auto-fire) consumes the auto-intent,
  // so the auto-resume effect below can never start a second checkout.
  const autoFired = useRef(false);

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    autoFired.current = true;
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

  // Auto-resume checkout when arriving from signup/signin with a chosen plan
  // (?plan=...&checkout=1). Fires once; on failure the normal highlighted
  // plan button + error message remain as the manual fallback. Strips
  // checkout=1 from the history entry (plain replaceState, not router.replace,
  // so Next's searchParams — and the button highlight — stay stable for this
  // render) so backing out of Stripe can't bounce the user straight back.
  useEffect(() => {
    if (autoFired.current) return;
    if (!autoCheckout || !preselectedPlan) return;
    if (isNativeApp() || tier !== "free") return;
    autoFired.current = true;
    window.history.replaceState(null, "", `/subscribe?plan=${preselectedPlan}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleSubscribe(preselectedPlan);
  }, [tier, autoCheckout, preselectedPlan]);

  const freeFeatures = [
    "7 free full-length hymns",
    "One full free listen of every song",
    "1-minute previews after that",
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

  // On native apps, show plans without pricing (reader app compliance).
  // Free-tier signup in-app is allowed (App Review 3.1.3(a)); only the paid
  // subscription must route externally, with no in-app pricing shown.
  if (isNativeApp()) {
    const nativePremiumBenefits = [
      "Full access to our entire catalog of sacred music",
      "Full-length songs and videos — no previews",
      "Unlimited streaming with no interruptions",
      "No voiceover prompts or sponsor banners",
      "Support the creation of sacred music",
    ];

    return (
      <div className="min-h-dvh bg-midnight flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm text-center">
          <Image
            src="/images/hymnz-logo1.png"
            alt="HYMNZ"
            width={48}
            height={48}
            className="mx-auto mb-6"
          />

          {/* Free tier — visitors only (account creation is allowed in-app) */}
          {tierResolved && tier === "visitor" && (
            <div className="glass-heavy rounded-2xl p-5 mb-6 text-left">
              <div className="flex items-center gap-2 mb-3">
                <Music size={16} className="text-accent" />
                <h2 className="text-display text-base font-bold text-text-primary">
                  Free Account
                </h2>
              </div>
              <ul className="space-y-2.5 mb-4">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check size={14} className="text-accent shrink-0 mt-0.5" />
                    <span className="text-text-secondary text-sm">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="block w-full py-3 text-center bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors glow-accent"
              >
                Create Free Account
              </Link>
            </div>
          )}

          {welcome && tier !== "visitor" && (
            <div className="glass rounded-xl px-4 py-3 mb-6 flex items-center justify-center gap-2">
              <CheckCircle size={16} className="text-accent shrink-0" />
              <span className="text-text-secondary text-sm">
                Account created &mdash; one more step
              </span>
            </div>
          )}

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

          {!tierResolved ? (
            <button
              disabled
              className="w-full py-3.5 bg-accent-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 glow-accent opacity-50"
            >
              Continue to subscribe
            </button>
          ) : tier === "visitor" ? (
            <Link
              href={`/auth/register?next=${encodeURIComponent("/subscribe?welcome=1")}`}
              className="block w-full py-3.5 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors text-center glow-accent"
            >
              Continue to subscribe
            </Link>
          ) : (
            <button
              onClick={() => openExternalLinkAccountWithHandoff("/subscribe")}
              className="w-full py-3.5 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 glow-accent"
            >
              <ExternalLink size={16} />
              Continue to subscribe
            </button>
          )}
          <p className="text-text-dim text-xs mt-3">
            {tierResolved && tier === "visitor"
              ? "You'll create a free account first, then finish on hymnz.com."
              : "Your subscription will sync automatically to this app."}
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
              <span className="text-2xl font-bold text-accent">$0.99</span>
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
                          Start for $0.99
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
          Payment is processed securely by Stripe and charged to your payment
          method at confirmation of purchase. Your subscription renews
          automatically — $3.99/month after your first month, or $38.30/year —
          unless you cancel before the end of the current period. You can cancel
          anytime.{" "}
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
