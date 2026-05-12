"use client";

import {
  Users,
  Search,
  Share2,
  Mic2,
  Church,
  Smartphone,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ReferralSource =
  | "friend"
  | "search"
  | "social"
  | "podcast"
  | "church"
  | "appstore"
  | "other";

const SOURCES: Array<{
  id: ReferralSource;
  label: string;
  icon: typeof Users;
}> = [
  { id: "friend", label: "Friend / Family", icon: Users },
  { id: "search", label: "Search", icon: Search },
  { id: "social", label: "Social Media", icon: Share2 },
  { id: "podcast", label: "Podcast", icon: Mic2 },
  { id: "church", label: "Church", icon: Church },
  { id: "appstore", label: "App Store", icon: Smartphone },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

interface OnboardingStepWelcomeProps {
  selectedSource: ReferralSource | null;
  onSourceChange: (s: ReferralSource | null) => void;
  detail: string;
  onDetailChange: (v: string) => void;
}

export function OnboardingStepWelcome({
  selectedSource,
  onSourceChange,
  detail,
  onDetailChange,
}: OnboardingStepWelcomeProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-accent-16 flex items-center justify-center glow-accent">
          <Sparkles size={24} className="text-accent" />
        </div>
        <h2
          id="onboarding-step-title"
          className="text-display text-2xl font-semibold text-text-primary"
        >
          Welcome to HYMNZ
        </h2>
        <p className="text-sm text-text-secondary max-w-sm">
          We&apos;re glad you&apos;re here. How did you find us?
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {SOURCES.map(({ id, label, icon: Icon }) => {
          const active = selectedSource === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSourceChange(active ? null : id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all",
                "border backdrop-blur-sm",
                active
                  ? "bg-accent-26 border-accent/60 text-text-primary glow-accent"
                  : "bg-white/5 border-white/10 text-text-secondary hover:border-white/25 hover:text-text-primary"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="onboarding-detail"
          className="text-xs font-medium text-text-secondary"
        >
          Tell us a bit more (optional)
        </label>
        <textarea
          id="onboarding-detail"
          value={detail}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder="e.g. saw a TikTok, my pastor recommended it…"
          rows={2}
          maxLength={2000}
          className={cn(
            "w-full px-3 py-2 rounded-lg text-sm text-text-primary placeholder:text-text-dim resize-none",
            "bg-white/5 border border-white/10 backdrop-blur-sm",
            "outline-none transition-all duration-200",
            "focus:border-accent/50 focus:ring-1 focus:ring-accent/25",
            "hover:border-white/20"
          )}
        />
      </div>
    </div>
  );
}
