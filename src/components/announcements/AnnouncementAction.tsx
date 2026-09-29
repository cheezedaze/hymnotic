"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnnouncementAction as Action } from "@/lib/announcements/actions";
import { isAnnouncementUrl } from "@/lib/announcements/actions";
import { TrackActions } from "@/components/player/TrackActions";
import { openExternalBrowser } from "@/lib/utils/platform";

export function AnnouncementAction({ announcement, onComplete }: {
  announcement: Partial<Action>;
  onComplete?: (message: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  if (announcement.actionType === "track" && announcement.actionTrackId) {
    return <TrackActions trackId={announcement.actionTrackId} onComplete={onComplete} navigate />;
  }
  const url = announcement.actionUrl;
  if (announcement.actionType !== "link" || !url || !isAnnouncementUrl(url)) return null;

  const open = async () => {
    try {
      const destination = new URL(url, window.location.origin);
      if ([window.location.origin, "https://www.hymnz.com", "https://hymnz.com"].includes(destination.origin)) {
        router.push(destination.pathname + destination.search + destination.hash);
      } else {
        await openExternalBrowser(url);
      }
      onComplete?.("");
    } catch { setError("Could not open this link. Please try again."); }
  };

  return <div className="space-y-2">
    <button type="button" onClick={open} className="w-full py-3 bg-accent/15 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors">
      {announcement.actionLabel || "Learn More"}
    </button>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </div>;
}
