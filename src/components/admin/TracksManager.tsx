"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Music,
  FileText,
  Video,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatTime } from "@/lib/utils/formatTime";

interface TrackRow {
  id: string;
  title: string;
  artist: string;
  collectionId: string;
  duration: number;
  trackNumber: number;
  playCount: number;
  isActive: boolean;
  publishedAt: Date | null;
  releaseScheduledAt?: string | null;
  releaseError?: string | null;
  hasVideo: boolean;
  hasLyrics: boolean;
  artworkUrl: string | null;
  audioUrl: string | null;
  audioKey: string | null;
}

interface TracksManagerProps {
  tracks: TrackRow[];
  collections: Array<{ id: string; title: string }>;
}

export function TracksManager({ tracks: initialTracks, collections }: TracksManagerProps) {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackRow[]>(initialTracks);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredTracks = tracks.filter((track) =>
    (!filter || track.collectionId === filter) &&
    (!query || [track.title, track.artist, track.id, collections.find((c) => c.id === track.collectionId)?.title || ""].some((value) => value.toLowerCase().includes(query)))
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) router.push(`/admin/tracks/new?title=${encodeURIComponent(title.trim())}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this track and its lyrics?")) return;
    setDeleting(id);

    try {
      const res = await fetch(`/api/admin/tracks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("Failed to delete track");
        return;
      }
      setTracks((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } catch {
      alert("Something went wrong");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    setTogglingActive(id);
    try {
      const res = await fetch(`/api/admin/tracks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update track");
        return;
      }
      setTracks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: !currentValue } : t))
      );
    } catch {
      alert("Something went wrong");
    } finally {
      setTogglingActive(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-2xl font-bold text-text-primary">
            Tracks
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {filteredTracks.length} track{filteredTracks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setTitle("");
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold/15 border border-gold/25 text-gold rounded-xl text-sm font-medium hover:bg-gold/25 transition-colors"
        >
          <Plus size={16} />
          New Track
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-text-muted" />
        <input aria-label="Search tracks" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tracks, artists, or collections…"
          className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50" />
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            !filter
              ? "bg-accent/15 text-accent"
              : "bg-white/5 text-text-muted hover:bg-white/10"
          )}
        >
          All
        </button>
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === c.id
                ? "bg-accent/15 text-accent"
                : "bg-white/5 text-text-muted hover:bg-white/10"
            )}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="glass-heavy rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-text-primary">
            New Track
          </h3>
          <div>
            <label htmlFor="new-track-title" className="block text-xs font-medium text-text-secondary mb-1.5">Track name</label>
            <input id="new-track-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus
              placeholder="Track title"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50" />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 bg-gold/20 border border-gold/30 text-gold rounded-xl text-sm font-medium hover:bg-gold/30 transition-colors disabled:opacity-50"
            >
              Continue to Track
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-white/5 border border-white/10 text-text-secondary rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tracks list */}
      <div className="space-y-1">
        {filteredTracks.length === 0 ? (
          <div className="glass-heavy rounded-xl p-8 text-center">
            <Music size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">
              {search || filter ? "No tracks match your search or collection filter." : "No tracks yet. Add your first one!"}
            </p>
          </div>
        ) : (
          filteredTracks.map((track) => (
            <div
              key={track.id}
              className="glass rounded-xl px-4 py-3 flex items-center gap-3"
            >
              {/* Artwork */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                {track.artworkUrl ? (
                  <Image
                    src={track.artworkUrl}
                    alt={track.title}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music size={14} className="text-text-dim" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {track.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-muted">
                    {track.collectionId}
                  </span>
                  <span className="text-xs text-text-dim">·</span>
                  <span className="text-xs text-text-muted">
                    {formatTime(track.duration)}
                  </span>
                  <span className="text-xs text-text-dim">·</span>
                  <span className="text-xs text-text-muted">
                    {track.playCount.toLocaleString()} plays
                  </span>
                </div>
              </div>

              {track.releaseError && <span className="text-xs text-red-400" title={track.releaseError}>Release needs attention</span>}

              {/* Badges */}
              <div className="flex items-center gap-1.5">
                {track.hasLyrics && (
                  <span className="p-1 rounded bg-accent/10" title="Has lyrics">
                    <FileText size={12} className="text-accent" />
                  </span>
                )}
                {track.hasVideo && (
                  <span className="p-1 rounded bg-gold/10" title="Has video">
                    <Video size={12} className="text-gold" />
                  </span>
                )}
                {track.audioKey && (
                  <span className="p-1 rounded bg-green-500/10" title="Has audio">
                    <Music size={12} className="text-green-400" />
                  </span>
                )}
              </div>

              {/* Active toggle */}
              <button
                onClick={() => track.publishedAt ? handleToggleActive(track.id, track.isActive) : router.push(`/admin/tracks/${track.id}#release`)}
                disabled={togglingActive === track.id}
                title={track.publishedAt ? (track.isActive ? "Active (click to deactivate)" : "Inactive (click to activate)") : "Open release settings"}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
                  track.isActive
                    ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                    : "bg-white/5 text-text-dim hover:bg-white/10"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", track.isActive ? "bg-green-400" : "bg-white/30")} />
                {track.isActive ? "Active" : track.releaseScheduledAt ? "Scheduled" : track.publishedAt ? "Inactive" : "Draft"}
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => router.push(`/admin/tracks/${track.id}`)}
                  className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-accent transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(track.id)}
                  disabled={deleting === track.id}
                  className={cn(
                    "p-2 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors",
                    deleting === track.id && "opacity-50"
                  )}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
