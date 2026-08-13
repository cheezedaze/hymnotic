export const CANONICAL_APP_ORIGIN = "https://www.hymnz.com";

export interface ShareData {
  type: "track" | "collection";
  id: string;
  title: string;
  artist?: string;
  artworkUrl?: string | null;
}

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

function encodedId(id: string): string {
  return encodeURIComponent(id);
}

export function buildShareUrl(data: ShareData): string {
  const segment = data.type === "track" ? "track" : "collection";
  return `${CANONICAL_APP_ORIGIN}/${segment}/${encodedId(data.id)}`;
}

export function buildTrackShareImageUrl(id: string): string {
  return `${CANONICAL_APP_ORIGIN}/track/${encodedId(id)}/opengraph-image`;
}

export function buildShareText(data: ShareData): string {
  if (data.type === "track") {
    return `Listen to “${data.title}” by ${data.artist || "HYMNZ"} on HYMNZ`;
  }
  return `Check out “${data.title}” on HYMNZ`;
}

export function buildSharePayload(data: ShareData): SharePayload {
  return {
    title: data.title,
    text: buildShareText(data),
    url: buildShareUrl(data),
  };
}
