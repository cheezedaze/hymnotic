"use client";

import { cn } from "@/lib/utils/cn";

interface OnboardingProgressDotsProps {
  total: number;
  current: number;
}

export function OnboardingProgressDots({
  total,
  current,
}: OnboardingProgressDotsProps) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i + 1 === current;
        const isPast = i + 1 < current;
        return (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              isActive ? "w-6 bg-accent" : "w-1.5",
              !isActive && (isPast ? "bg-accent/50" : "bg-white/15")
            )}
          />
        );
      })}
    </div>
  );
}
