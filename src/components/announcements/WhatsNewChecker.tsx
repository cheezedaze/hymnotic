"use client";

import { useState, useEffect } from "react";
import { WhatsNewModal } from "./WhatsNewModal";

interface AnnouncementData {
  id: number;
  title: string;
  body: string;
  publishedAt: string | null;
}

export function WhatsNewChecker() {
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(
    null
  );

  useEffect(() => {
    // Delay to avoid competing with initial page load
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/announcements/latest");
        if (!res.ok) return;
        const data = await res.json();
        if (data.announcement) {
          setAnnouncement(data.announcement);
        }
      } catch {
        // Silently fail — not critical
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = async () => {
    if (!announcement) return;

    // Dismiss optimistically
    setAnnouncement(null);

    try {
      await fetch("/api/announcements/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: announcement.id }),
      });
    } catch {
      // Dismiss is best-effort; modal already closed
    }
  };

  if (!announcement) return null;

  return <WhatsNewModal announcement={announcement} onDismiss={handleDismiss} />;
}
