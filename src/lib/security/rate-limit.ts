// Best-effort in-memory sliding-window limiter. On serverless (Vercel) this
// resets across cold starts / instances, so it is a cheap secondary layer —
// Turnstile is the real defense. Mirrors the pattern in forgot-password.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const buckets = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
  max: number = RATE_LIMIT_MAX
): boolean {
  const now = Date.now();
  const bucket = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  bucket.push(now);
  buckets.set(key, bucket);
  return bucket.length > max;
}
