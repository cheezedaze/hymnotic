// Soft gate for promo-page free listens (see brainstorms/2026-07-16-video-promo-page.md).
// localStorage-based by design: a nudge toward registration, not DRM.

export function promoListenKey(trackId: string): string {
  return `hymnz-promo-listen:${trackId}`;
}

/** stored is the raw localStorage value for promoListenKey(trackId), or null. */
export function canPlayPromo(
  isAuthenticated: boolean,
  stored: string | null
): boolean {
  if (isAuthenticated) return true;
  return stored !== "used";
}

export function markPromoListenUsed(trackId: string): void {
  try {
    localStorage.setItem(promoListenKey(trackId), "used");
  } catch {
    // Private browsing / storage disabled — soft gate stays soft.
  }
}

export function getPromoListenState(trackId: string): string | null {
  try {
    return localStorage.getItem(promoListenKey(trackId));
  } catch {
    return null;
  }
}
