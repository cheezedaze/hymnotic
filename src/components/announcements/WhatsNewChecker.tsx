"use client";

import { useState, useEffect } from "react";
import { WhatsNewModal } from "./WhatsNewModal";
import type { AnnouncementAction } from "@/lib/announcements/actions";
import { usePathname } from "next/navigation";

interface AnnouncementData extends Partial<AnnouncementAction> {
  id: number;
  title: string;
  body: string;
  publishedAt: string | null;
}

export function WhatsNewChecker() {
  const pathname = usePathname();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
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

  return <>
    {announcement && !pathname.startsWith("/track/") && <WhatsNewModal announcement={announcement} onDismiss={handleDismiss} onActionComplete={(message) => {
      setNotice(message);
      void handleDismiss();
    }} />}
    {notice && <div role="status" className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-3rem)] max-w-sm rounded-xl bg-midnight border border-accent/30 px-4 py-3 text-sm text-accent text-center shadow-lg">{notice}</div>}
  </>;
}
