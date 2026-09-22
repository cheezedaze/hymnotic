"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { TrackRelease } from "@/lib/db/schema";
import { AdminInput } from "./AdminInput";
import { AdminTextarea } from "./AdminTextarea";

const TipTapEditor = dynamic(() => import("./TipTapEditor").then((mod) => mod.TipTapEditor), { ssr: false });

function localDateTime(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

interface Props {
  trackId: string;
  title: string;
  artworkUrl: string;
  initialRelease: TrackRelease | null;
  isActive: boolean;
  disabledReason: string;
  onReleased: () => void;
}

export function TrackReleasePanel({ trackId, title, artworkUrl, initialRelease, isActive, disabledReason, onReleased }: Props) {
  const [release, setRelease] = useState(initialRelease);
  const [mode, setMode] = useState<"now" | "later">(initialRelease?.status === "scheduled" ? "later" : "now");
  const [dateTime, setDateTime] = useState(initialRelease?.status === "scheduled" ? localDateTime(initialRelease.scheduledAt) : "");
  const [withAnnouncement, setWithAnnouncement] = useState(initialRelease ? !!initialRelease.announcementTitle : true);
  const [withPush, setWithPush] = useState(initialRelease ? !!initialRelease.pushTitle : true);
  const [announcementTitle, setAnnouncementTitle] = useState(initialRelease?.announcementTitle || `New release: ${title}`);
  const [announcementBody, setAnnouncementBody] = useState(initialRelease?.announcementBody || "");
  const [pushTitle, setPushTitle] = useState(initialRelease?.pushTitle || "New music on HYMNZ");
  const [pushBody, setPushBody] = useState(initialRelease?.pushBody || `Listen to ${title}, available now.`);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const deliveryInProgress = release?.status === "published" || release?.status === "sending";
  const showStatus = isActive || deliveryInProgress;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!release || !["scheduled", "published", "sending"].includes(release.status)) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/tracks/${trackId}/release`);
        if (!res.ok) return;
        const latest: TrackRelease | null = await res.json();
        setRelease(latest);
        if (latest && latest.status !== "scheduled" && release.status === "scheduled") onReleased();
      } catch { /* The next poll retries; the server scheduler is independent. */ }
    }, 15_000);
    return () => clearInterval(timer);
  }, [trackId, release, onReleased]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabledReason || uploadingImage) return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const scheduledAt = mode === "later" ? new Date(dateTime) : null;
      if (scheduledAt && (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date() || localDateTime(scheduledAt) !== dateTime)) {
        setError("Choose a valid future date and time.");
        return;
      }
      const res = await fetch(`/api/admin/tracks/${trackId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          immediate: mode === "now", scheduledAt: scheduledAt?.toISOString(),
          announcementTitle: withAnnouncement ? announcementTitle : null,
          announcementBody: withAnnouncement ? announcementBody : null,
          pushTitle: withPush ? pushTitle : null,
          pushBody: withPush ? pushBody : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not save the release."); return; }
      setRelease(data);
      if (data.status !== "scheduled") onReleased();
      setMessage(data.status === "scheduled" ? "Release scheduled. You can close this page." : "Track released.");
    } catch {
      setError("Could not confirm the release. Refresh to check its status before trying again.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tracks/${trackId}/release`, { method: "DELETE" });
      if (!res.ok) { setError((await res.json()).error || "Could not cancel the release."); return; }
      setRelease(null);
      setMessage("Schedule canceled. The track is still inactive.");
    } catch { setError("Could not cancel the release. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <section id="release" className="glass-heavy rounded-xl p-5 space-y-4 scroll-mt-6">
      <h2 className="text-sm font-semibold text-text-primary">{showStatus ? "Release status" : "Release Track"}</h2>
      {release?.error && <p role="alert" className="text-sm text-red-400">{release.error}</p>}
      {release?.status === "attention" && <Link href="/admin/push" className="text-sm text-accent underline">Review push notifications</Link>}
      {showStatus ? (
        <div className="space-y-2 text-sm text-text-secondary">
          <p>{isActive ? "The track is active. Use Active above to deactivate it. Once inactive, you can release it now or schedule another release." : "The track is inactive. Wait for the current push delivery to finish before scheduling another release."}</p>
          {release?.status === "completed" && release.pushTitle && <p>Push sent to {release.sentCount} device{release.sentCount === 1 ? "" : "s"}.</p>}
          {(release?.status === "sending" || release?.status === "published") && <p>Push notification delivery is in progress.</p>}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <p className="text-sm text-text-muted">Release the track on its own, or include an announcement and a push notification.</p>
          {release?.status === "scheduled" && <p className="text-sm text-accent">Scheduled for {new Date(release.scheduledAt).toLocaleString()} ({timeZone}). The track stays inactive until then.</p>}
          <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
            <div className="flex gap-5 text-sm text-text-secondary">
              <label className="flex items-center gap-2"><input type="radio" name="release-mode" checked={mode === "now"} onChange={() => setMode("now")} />Release now</label>
              <label className="flex items-center gap-2"><input type="radio" name="release-mode" checked={mode === "later"} onChange={() => setMode("later")} />Schedule release</label>
            </div>
            {mode === "later" && <div className="space-y-1">
              <AdminInput label="Release date and time" type="datetime-local" value={dateTime} onChange={setDateTime} required />
              <p className="text-xs text-text-muted">Time zone: {timeZone}. Releases are checked every minute.</p>
            </div>}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={withAnnouncement} onChange={(e) => setWithAnnouncement(e.target.checked)} />Publish a release announcement</label>
              {withAnnouncement && <>
                <p className="text-xs text-text-muted">This will become the only published announcement when the track releases.</p>
                <AdminInput label="Announcement title" value={announcementTitle} onChange={setAnnouncementTitle} required />
                <TipTapEditor initialContent={announcementBody} onUpdate={setAnnouncementBody} trackArtworkUrl={artworkUrl} onUploadingImageChange={setUploadingImage} />
                <p className="text-xs text-text-muted">Use the image menu to {artworkUrl ? "select the track artwork, " : ""}upload an image or paste an image URL.</p>
              </>}
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={withPush} onChange={(e) => setWithPush(e.target.checked)} />Send a release push notification</label>
              {withPush && <>
                <AdminInput label="Push title" value={pushTitle} onChange={setPushTitle} required />
                <AdminTextarea label="Push message" value={pushBody} onChange={setPushBody} rows={3} required />
                <p className="text-xs text-text-muted">Sent to all devices with notifications enabled when this track releases.</p>
              </>}
            </div>
          </fieldset>
          {disabledReason && <p className="text-sm text-amber-300">{disabledReason}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || !!disabledReason || uploadingImage}
              className="px-4 py-2.5 bg-gold/15 border border-gold/25 text-gold rounded-xl text-sm font-medium hover:bg-gold/25 disabled:opacity-50">
              {busy ? "Saving release…" : mode === "now" ? "Release now" : release?.status === "scheduled" ? "Update schedule" : "Schedule release"}
            </button>
            {release?.status === "scheduled" && <button type="button" disabled={busy} onClick={cancel} className="px-4 py-2.5 bg-white/5 text-text-secondary rounded-xl text-sm">Cancel schedule</button>}
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {message && <p role="status" className="text-sm text-green-400">{message}</p>}
    </section>
  );
}
