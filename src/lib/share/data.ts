import type { ShareData } from "@/lib/store/shareStore";
import { HYMNZ_ORIGIN, trackUrl } from "@/lib/deep-links/urls";

export function buildShareUrl(data: ShareData): string {
  return data.type === "track" ? trackUrl(data.id) : `${HYMNZ_ORIGIN}/collection/${encodeURIComponent(data.id)}`;
}

export function buildShareText(data: ShareData): string {
  return data.type === "track"
    ? `Listen to “${data.title}” by ${data.artist || "HYMNZ"} on HYMNZ`
    : `Check out “${data.title}” on HYMNZ`;
}
