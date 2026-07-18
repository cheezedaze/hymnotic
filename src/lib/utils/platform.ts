/**
 * Platform detection utilities for Capacitor native apps.
 * Falls back gracefully when Capacitor is not available (web context).
 */

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Capacitor injects this on the window object in native apps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    return cap?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    return cap?.getPlatform?.() === "ios";
  } catch {
    return false;
  }
}

export function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    return cap?.getPlatform?.() === "android";
  } catch {
    return false;
  }
}

/**
 * Open a URL in the system browser (Safari on iOS, Chrome on Android).
 * On web, navigates in the current tab.
 */
export async function openExternalBrowser(url: string): Promise<void> {
  if (isNativeApp()) {
    try {
      // Capacitor's Browser plugin opens a Custom Tab (Android) / SFSafariView
      // (iOS) — the Cordova-only `window.open(url, "_system")` is a no-op here.
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
    } catch {
      // Terminal fallback: if the plugin isn't registered in this native build,
      // still open the URL rather than silently doing nothing.
      window.open(url, "_blank");
    }
  } else {
    window.open(url, "_blank");
  }
}

/**
 * Open the external subscribe link using Apple's ExternalLinkAccount API
 * (reader app entitlement). This shows Apple's required disclosure sheet
 * before opening Safari. Falls back to opening Safari directly if the
 * entitlement isn't approved yet or on Android/web.
 */
export async function openExternalLinkAccount(
  fallbackUrl = "https://www.hymnz.com/subscribe"
): Promise<void> {
  if (isIOS() && isNativeApp()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cap = (window as any).Capacitor;
      const plugin = cap?.Plugins?.ExternalLink;
      if (plugin) {
        await plugin.open({ url: fallbackUrl });
        return;
      }
    } catch {
      // Plugin not available — fall through to fallback
    }
  }

  // Android, web, or plugin not available — open in external browser
  await openExternalBrowser(fallbackUrl);
}

/**
 * Open the external subscribe flow in Safari while carrying the native user's
 * sign-in over via a one-time handoff token, so they land already
 * authenticated (no second login). Mints the token from the authenticated
 * WebView, then opens the exchange endpoint via {@link openExternalLinkAccount}
 * (keeping Apple's reader disclosure). Falls back to the plain page on any
 * failure so behavior never regresses.
 */
export async function openExternalLinkAccountWithHandoff(
  next = "/subscribe"
): Promise<void> {
  const base = "https://www.hymnz.com";
  const plainUrl = `${base}${next}`;

  if (!isNativeApp()) {
    window.location.href = plainUrl;
    return;
  }

  try {
    const res = await fetch("/api/auth/handoff/create", {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      const { token } = await res.json();
      if (token) {
        const exchangeUrl = `${base}/api/auth/handoff/exchange?token=${encodeURIComponent(
          token
        )}&next=${encodeURIComponent(next)}`;
        await openExternalLinkAccount(exchangeUrl);
        return;
      }
    }
  } catch {
    // fall through to the plain (re-login) flow
  }

  await openExternalLinkAccount(plainUrl);
}
