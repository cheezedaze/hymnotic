"use client";

import { Music } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface OnboardingStepMusicProps {
  value: string;
  onChange: (v: string) => void;
}

export function OnboardingStepMusic({
  value,
  onChange,
}: OnboardingStepMusicProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-accent-16 flex items-center justify-center glow-accent">
          <Music size={24} className="text-accent" />
        </div>
        <h2
          id="onboarding-step-title"
          className="text-display text-2xl font-semibold text-text-primary"
        >
          What music moves you?
        </h2>
        <p className="text-sm text-text-secondary max-w-sm">
          Share your favorite genres and the bands or artists you love.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="onboarding-music"
          className="text-xs font-medium text-text-secondary"
        >
          Your favorites
        </label>
        <textarea
          id="onboarding-music"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. indie folk, gospel, worship; Bon Iver, Phil Wickham, The Porter&apos;s Gate…"
          rows={5}
          maxLength={2000}
          className={cn(
            "w-full px-3 py-2 rounded-lg text-sm text-text-primary placeholder:text-text-dim resize-none",
            "bg-white/5 border border-white/10 backdrop-blur-sm",
            "outline-none transition-all duration-200",
            "focus:border-accent/50 focus:ring-1 focus:ring-accent/25",
            "hover:border-white/20"
          )}
          autoFocus
        />
      </div>
    </div>
  );
}
