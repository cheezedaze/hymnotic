"use client";

import { useEffect, useState } from "react";
import { noAnnouncementAction, type AnnouncementAction } from "@/lib/announcements/actions";

interface TrackOption { id: string; title: string; artist?: string | null }

export function AnnouncementActionFields({ action, onChange, currentTrack }: {
  action: AnnouncementAction;
  onChange: (action: AnnouncementAction) => void;
  currentTrack?: TrackOption;
}) {
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  const [trackError, setTrackError] = useState("");

  useEffect(() => {
    if (action.actionType !== "track") return;
    const controller = new AbortController();
    fetch("/api/tracks", { signal: controller.signal }).then(async (res) => {
      if (!res.ok) throw new Error("Could not load tracks. Try this option again.");
      setTracks(await res.json());
      setTrackError("");
    }).catch((err) => {
      if (!controller.signal.aborted) setTrackError(err.message);
    });
    return () => controller.abort();
  }, [action.actionType]);

  const options = tracks.filter((track) => track.id !== currentTrack?.id);
  const selectedIsListed = action.actionTrackId === currentTrack?.id || options.some((track) => track.id === action.actionTrackId);

  return <div className="space-y-3">
    <label className="block text-xs font-medium text-text-secondary">
      Optional button
      <select value={action.actionType ?? ""} onChange={(e) => {
        const type = (e.target.value || null) as AnnouncementAction["actionType"];
        onChange({ ...noAnnouncementAction, actionType: type, actionTrackId: type === "track" ? currentTrack?.id ?? null : null });
      }} className="mt-1.5 w-full px-3 py-2.5 bg-midnight border border-white/10 rounded-xl text-sm text-text-primary">
        <option value="">None</option><option value="track">Play a track</option><option value="link">Open a link / video</option>
      </select>
    </label>
    {action.actionType === "track" && <>
      <label className="block text-xs font-medium text-text-secondary">
        Track
        <select value={action.actionTrackId ?? ""} onChange={(e) => onChange({ ...action, actionTrackId: e.target.value })}
          className="mt-1.5 w-full px-3 py-2.5 bg-midnight border border-white/10 rounded-xl text-sm text-text-primary">
          <option value="">Choose a released track…</option>
          {currentTrack && <option value={currentTrack.id}>This track — {currentTrack.title}</option>}
          {action.actionTrackId && !selectedIsListed && <option value={action.actionTrackId}>Selected track: {action.actionTrackId}</option>}
          {options.map((track) => <option key={track.id} value={track.id}>{track.title} — {track.artist}</option>)}
        </select>
      </label>
      <p className="text-xs text-text-muted">Shows Play Now and Dismiss. While a song is playing, also shows Add to Up Next.</p>
      {trackError && <p role="alert" className="text-xs text-red-400">{trackError}</p>}
    </>}
    {action.actionType === "link" && <>
      <label className="block text-xs font-medium text-text-secondary">Button text
        <input value={action.actionLabel ?? ""} maxLength={60} placeholder="Watch Video" onChange={(e) => onChange({ ...action, actionLabel: e.target.value })}
          className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary" />
      </label>
      <label className="block text-xs font-medium text-text-secondary">Destination
        <input value={action.actionUrl ?? ""} placeholder="https://… or /about" onChange={(e) => onChange({ ...action, actionUrl: e.target.value })}
          className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary" />
      </label>
    </>}
  </div>;
}
