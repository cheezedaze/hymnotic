/**
 * Glitch logo animation timing – edit these values to change the pulse pattern.
 * - pulse: logo visible for this many seconds
 * - gap: logo hidden for this many seconds
 * Pattern: two quick pulses → 1s gap → one pulse → 1s gap → one pulse → 1.5s gap
 *          → two quick pulses → 0.5s gap → one pulse → 2s gap → loop
 */
export const GLITCH_PATTERN = [
  { type: "pulse" as const, duration: 0.1 },
  { type: "pulse" as const, duration: 0.1 },
  { type: "gap" as const, duration: 3 },
  { type: "pulse" as const, duration: 0.1 },
  { type: "gap" as const, duration: 3 },
  { type: "pulse" as const, duration: 0.1 },
  { type: "gap" as const, duration: 4 },
  { type: "pulse" as const, duration: 0.1 },
  { type: "gap" as const, duration: 0.1 },
  { type: "pulse" as const, duration: 0.1 },
  { type: "gap" as const, duration: 2 },
  { type: "pulse" as const, duration: 0.1 },
  { type: "gap" as const, duration: 3 },
];

/** Total cycle duration in seconds (auto from pattern) */
export const GLITCH_DURATION = GLITCH_PATTERN.reduce(
  (sum, seg) => sum + seg.duration,
  0
);

/** Build keyframes CSS from the pattern */
export function buildGlitchKeyframes(): string {
  let t = 0;
  const total = GLITCH_DURATION;
  const opacity0: number[] = [];
  const opacity1: number[] = [];

  for (let i = 0; i < GLITCH_PATTERN.length; i++) {
    const pct = (t / total) * 100;
    const seg = GLITCH_PATTERN[i];
    (seg.type === "pulse" ? opacity1 : opacity0).push(pct);
    t += seg.duration;
  }
  opacity0.push(100);

  const fmt = (vals: number[]) =>
    [...new Set(vals)].sort((a, b) => a - b).join("%, ");

  return `:root { --glitch-duration: ${GLITCH_DURATION}s; }
@keyframes glitch-flicker {
  ${fmt(opacity0)}% { opacity: 0; }
  ${fmt(opacity1)}% { opacity: 1; }
}`;
}
