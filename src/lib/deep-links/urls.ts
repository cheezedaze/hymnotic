export const HYMNZ_ORIGIN = "https://www.hymnz.com";

export function trackPath(id: string): string {
  return `/track/${encodeURIComponent(id)}`;
}

export function trackUrl(id: string): string {
  return HYMNZ_ORIGIN + trackPath(id);
}

/** Incoming URLs select a page, never an autoplay or arbitrary redirect target. */
export function parseTrackLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== HYMNZ_ORIGIN || url.username || url.password) return null;
    const match = /^\/track\/([^/]+)\/?$/.exec(url.pathname);
    if (!match) return null;
    const id = decodeURIComponent(match[1]);
    if (!id.trim() || id.length > 128 || /[/\\\u0000-\u001f\u007f]/.test(id) || id === "." || id === "..") return null;
    return trackPath(id);
  } catch { return null; }
}
