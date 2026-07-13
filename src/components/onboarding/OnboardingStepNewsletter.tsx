"use client";

import { Mail, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface OnboardingStepNewsletterProps {
  optedIn: boolean;
  onChange: (v: boolean) => void;
}

export function OnboardingStepNewsletter({
  optedIn,
  onChange,
}: OnboardingStepNewsletterProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-accent-16 flex items-center justify-center glow-accent">
          <Mail size={24} className="text-accent" />
        </div>
        <h2
          id="onboarding-step-title"
          className="text-display text-2xl font-semibold text-text-primary"
        >
          Be first to hear new hymns
        </h2>
        <p className="text-sm text-text-secondary max-w-sm">
          Get an email when we add new collections and releases. No spam — just
          the music.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => onChange(true)}
          aria-pressed={optedIn}
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all",
            optedIn
              ? "bg-accent-16 border border-accent/50 text-text-primary glow-accent"
              : "bg-white/5 border border-white/10 text-text-secondary hover:border-white/20"
          )}
        >
          <span>Yes, keep me posted on new releases</span>
          <span
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors",
              optedIn ? "bg-accent" : "border border-white/20"
            )}
          >
            {optedIn && <Check size={12} className="text-midnight" />}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          aria-pressed={!optedIn}
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all",
            !optedIn
              ? "bg-white/10 border border-white/20 text-text-primary"
              : "bg-white/5 border border-white/10 text-text-secondary hover:border-white/20"
          )}
        >
          <span>No thanks, not right now</span>
          <span
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors",
              !optedIn ? "bg-white/40" : "border border-white/20"
            )}
          >
            {!optedIn && <Check size={12} className="text-midnight" />}
          </span>
        </button>
      </div>

      {optedIn && (
        <p className="text-xs text-text-dim text-center">
          We&rsquo;ll send a confirmation link to your email — tap it to finish
          subscribing.
        </p>
      )}
    </div>
  );
}
