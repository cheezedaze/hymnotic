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
