"use client";

import { useEffect, useRef, useState } from "react";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import {
  OnboardingWizard,
  type OnboardingPayload,
} from "./OnboardingWizard";

export function OnboardingChecker() {
  const tier = useSubscriptionStore((s) => s.tier);
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);

  const [shouldShow, setShouldShow] = useState(false);
  const checkedRef = useRef(false);

  // Fetch onboarding state once per session, after subscription has loaded
  // and only for logged-in users.
  useEffect(() => {
    if (!isLoaded) return;
    if (checkedRef.current) return;
    if (tier === "visitor") return;

    checkedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/user/onboarding");
        if (!res.ok) return;
        const data = (await res.json()) as { shouldShow?: boolean };
        if (!cancelled && data.shouldShow) {
          setShouldShow(true);
        }
      } catch {
        // silent — never block the app on this
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, tier]);

  const handleSkip = () => {
    setShouldShow(false);
    fetch("/api/user/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    }).catch(() => {
      // ignore
    });
  };

  const handleComplete = (payload: OnboardingPayload) => {
    setShouldShow(false);
    fetch("/api/user/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        referralSource: payload.referralSource,
        referralDetail: payload.referralDetail,
        favoriteMusic: payload.favoriteMusic,
        favoriteHymns: payload.favoriteHymns,
      }),
    }).catch(() => {
      // ignore
    });
  };

  if (!shouldShow) return null;

  return (
    <OnboardingWizard
      isOpen
      tier={tier === "paid" ? "paid" : "free"}
      onSkip={handleSkip}
      onComplete={handleComplete}
    />
  );
}
