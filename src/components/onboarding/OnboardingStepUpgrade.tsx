"use client";

import { Crown, Check } from "lucide-react";
import { SubscribeCTA } from "@/components/subscription/SubscribeCTA";

const BENEFITS = [
  "Unlock every track in every collection",
  "Lossless audio quality",
  "Ad-free, distraction-free listening",
  "Offline downloads on mobile",
  "Support the artists making HYMNZ",
];

export function OnboardingStepUpgrade() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center glow-gold">
          <Crown size={24} className="text-gold" />
        </div>
        <h2
          id="onboarding-step-title"
          className="text-display text-2xl font-semibold text-text-primary"
        >
          Unlock the full experience
        </h2>
        <p className="text-sm text-text-secondary max-w-sm">
          Go Premium for unlimited access to every hymn, in the best quality.
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {BENEFITS.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2.5 text-sm text-text-primary"
          >
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-accent-16 flex items-center justify-center">
              <Check size={12} className="text-accent" />
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <SubscribeCTA />
    </div>
  );
}
