import { useCallback } from "react";
import { useShareStore, type ShareData } from "@/lib/store/shareStore";

function buildShareUrl(data: ShareData): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  if (data.type === "track") {
    return `${base}/track/${data.id}`;
  }
  return `${base}/collection/${data.id}`;
}

function buildShareText(data: ShareData): string {
  if (data.type === "track") {
    const artist = data.artist || "HYMNZ";
    return `Listen to "${data.title}" by ${artist} on HYMNZ`;
  }
  return `Check out "${data.title}" on HYMNZ`;
}

export function useShare() {
  const openShare = useShareStore((s) => s.openShare);

  const share = useCallback(
    async (data: ShareData) => {
      const url = buildShareUrl(data);
      const text = buildShareText(data);

      // Try native Web Share API first (mostly mobile)
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: data.title, text, url });
          return;
        } catch {
          // User cancelled or API failed — fall through to sheet
        }
      }

      // Fallback: open the ShareSheet
      openShare(data);
    },
    [openShare]
  );

  return { share, buildShareUrl, buildShareText };
}
