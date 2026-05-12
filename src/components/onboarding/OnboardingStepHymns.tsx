"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface OnboardingStepHymnsProps {
  value: string;
  onChange: (v: string) => void;
}

export function OnboardingStepHymns({
  value,
  onChange,
}: OnboardingStepHymnsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center glow-gold">
          <Heart size={24} className="text-gold" />
        </div>
        <h2
          id="onboarding-step-title"
          className="text-display text-2xl font-semibold text-text-primary"
        >
          Your favorite hymns?
        </h2>
        <p className="text-sm text-text-secondary max-w-sm">
          Which hymns mean the most to you? Titles or even just a first line are
          fine.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="onboarding-hymns"
          className="text-xs font-medium text-text-secondary"
        >
          The hymns you love
        </label>
        <textarea
          id="onboarding-hymns"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. It Is Well With My Soul, Be Thou My Vision, Come Thou Fount…"
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
