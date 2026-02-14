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
  hasVideo: boolean;
  hasLyrics: boolean;
  artworkUrl: string | null;
  audioUrl: string | null;
}

interface TracksManagerProps {
  tracks: TrackRow[];
  collections: Array<{ id: string; title: string }>;
}

export function TracksManager({ tracks, collections }: TracksManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    collectionId: collections[0]?.id || "",
    title: "",
    artist: "Hymnotic",
    duration: 0,
    trackNumber: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredTracks = filter
    ? tracks.filter((t) => t.collectionId === filter)
    : tracks;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create track");
        return;
      }

      const created = await res.json();
      setShowForm(false);
      router.push(`/admin/tracks/${created.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
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
      router.refresh();
    } catch {
      alert("Something went wrong");
    } finally {
      setDeleting(null);
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
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold/15 border border-gold/25 text-gold rounded-xl text-sm font-medium hover:bg-gold/25 transition-colors"
        >
          <Plus size={16} />
          New Track
        </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                ID (slug) *
              </label>
              <input
                type="text"
                value={form.id}
                onChange={(e) =>
                  setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
                }
                placeholder="e.g., sands-08"
                required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Collection *
              </label>
              <select
                value={form.collectionId}
                onChange={(e) =>
                  setForm({ ...form, collectionId: e.target.value })
                }
                required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id} className="bg-midnight">
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Track title"
                required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Artist
              </label>
              <input
                type="text"
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Duration (seconds) *
              </label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: parseFloat(e.target.value) || 0 })
                }
                required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Track Number *
              </label>
              <input
                type="number"
                value={form.trackNumber}
                onChange={(e) =>
                  setForm({
                    ...form,
                    trackNumber: parseInt(e.target.value) || 1,
                  })
                }
                required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gold/20 border border-gold/30 text-gold rounded-xl text-sm font-medium hover:bg-gold/30 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create & Edit Track"}
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
              No tracks yet. Add your first one!
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
                {track.audioUrl && (
                  <span className="p-1 rounded bg-green-500/10" title="Has audio">
                    <Music size={12} className="text-green-400" />
                  </span>
                )}
              </div>

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
