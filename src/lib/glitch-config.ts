/**
 * Glitch logo animation timing – edit these values to change the pulse pattern.
 * - pulse: logo visible for this many seconds
 * - gap: logo hidden for this many seconds
 * Pattern: two quick pulses → 1s gap → one pulse → 1s gap → one pulse → 1.5s gap
 *          → two quick pulses → 0.5s gap → one pulse → 2s gap → loop
 *
 * Each "pulse" is split into two 50ms frames:
 *   logo2 (hymnz-logo2.png) shows first 50ms
 *   logo3 (hymnz-logo3.png) shows second 50ms
 */
export const GLITCH_PATTERN = [
  { type: "pulse" as const, duration: 1 },
  { type: "pulse" as const, duration: 1 },
  { type: "gap" as const, duration: 3 },
  { type: "pulse" as const, duration: 1 },
  { type: "gap" as const, duration: 3 },
  { type: "pulse" as const, duration: 1 },
  { type: "gap" as const, duration: 4 },
  { type: "pulse" as const, duration: 1 },
  { type: "gap" as const, duration: 0.1 },
  { type: "pulse" as const, duration: 1 },
  { type: "gap" as const, duration: 2 },
  { type: "pulse" as const, duration: 1 },
  { type: "gap" as const, duration: 3 },
];

/** Total cycle duration in seconds (auto from pattern) */
export const GLITCH_DURATION = GLITCH_PATTERN.reduce(
  (sum, seg) => sum + seg.duration,
  0
);

/**
 * Build keyframes CSS from the pattern.
 * Generates two animations:
 *   glitch-flicker-2: logo2 shows during first half of each pulse
 *   glitch-flicker-3: logo3 shows during second half of each pulse
 */
export function buildGlitchKeyframes(): string {
  const total = GLITCH_DURATION;
  const halfPulse = 0.5; // 500ms each frame

  // Collect keyframe stops for each animation
  const frames2: Array<{ pct: number; opacity: number }> = [];
  const frames3: Array<{ pct: number; opacity: number }> = [];

  let t = 0;
  for (const seg of GLITCH_PATTERN) {
    const startPct = (t / total) * 100;
    const midPct = ((t + halfPulse) / total) * 100;
    const endPct = ((t + seg.duration) / total) * 100;

    if (seg.type === "pulse") {
      // logo2: on at start of pulse, off at midpoint
      frames2.push({ pct: startPct, opacity: 1 });
      frames2.push({ pct: midPct, opacity: 0 });
      // logo3: on at midpoint, off at end of pulse
      frames3.push({ pct: startPct, opacity: 0 });
      frames3.push({ pct: midPct, opacity: 1 });
      frames3.push({ pct: endPct, opacity: 0 });
    } else {
      // gap: both off
      frames2.push({ pct: startPct, opacity: 0 });
      frames3.push({ pct: startPct, opacity: 0 });
    }

    t += seg.duration;
  }
  // Ensure end state is off
  frames2.push({ pct: 100, opacity: 0 });
  frames3.push({ pct: 100, opacity: 0 });

  const buildKeyframes = (
    name: string,
    frames: Array<{ pct: number; opacity: number }>
  ) => {
    // Deduplicate by percentage (keep last seen opacity per pct)
    const map = new Map<number, number>();
    for (const f of frames) {
      map.set(Math.round(f.pct * 1000) / 1000, f.opacity);
    }
    const sorted = [...map.entries()].sort(([a], [b]) => a - b);
    const stops = sorted.map(([pct, op]) => `  ${pct}% { opacity: ${op}; }`).join("\n");
    return `@keyframes ${name} {\n${stops}\n}`;
  };

  return `:root { --glitch-duration: ${GLITCH_DURATION}s; }
${buildKeyframes("glitch-flicker-2", frames2)}
${buildKeyframes("glitch-flicker-3", frames3)}`;
}
