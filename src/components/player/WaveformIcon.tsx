"use client";

import { cn } from "@/lib/utils/cn";

interface WaveformIconProps {
  active?: boolean;
  className?: string;
}

export function WaveformIcon({ active = true, className }: WaveformIconProps) {
  return (
    <div className={cn("flex items-end gap-[2px] h-4", className)}>
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-[3px] rounded-full bg-accent transition-all",
            active
              ? `animate-[waveform-${((bar - 1) % 3) + 1}_0.8s_ease-in-out_infinite]`
              : "h-1"
          )}
          style={{
            animationDelay: active ? `${bar * 0.15}s` : undefined,
            animationName: active
              ? `waveform-${((bar - 1) % 3) + 1}`
              : undefined,
            animationDuration: active ? "0.8s" : undefined,
            animationTimingFunction: active ? "ease-in-out" : undefined,
            animationIterationCount: active ? "infinite" : undefined,
            height: active ? undefined : "4px",
          }}
        />
      ))}
    </div>
  );
}
