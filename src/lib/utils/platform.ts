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
export function openExternalBrowser(url: string): void {
  if (isNativeApp()) {
    // Open in system browser, not in-app webview
    window.open(url, "_system");
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
  openExternalBrowser(fallbackUrl);
}
