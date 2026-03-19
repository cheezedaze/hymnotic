"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Save, Music, Check } from "lucide-react";
import { AdminFileUpload } from "./AdminFileUpload";

interface EditCollectionProps {
  collection: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    artworkUrl: string | null;
    artworkKey: string | null;
    featured: boolean;
    isSacred7: boolean;
    sortOrder: number;
  };
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    trackNumber: number;
    duration: number;
  }>;
}

export function EditCollection({ collection, tracks }: EditCollectionProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: collection.title,
    subtitle: collection.subtitle || "",
    description: collection.description || "",
    featured: collection.featured,
    isSacred7: collection.isSacred7,
    sortOrder: collection.sortOrder,
    artworkKey: collection.artworkKey || "",
  });
  const [artworkPreview, setArtworkPreview] = useState(
    collection.artworkUrl || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Sacred 7 track picker state
  const [allTracks, setAllTracks] = useState<
    Array<{ id: string; title: string; artist: string; collectionId: string; collectionTitle?: string; duration: number }>
  >([]);
  const [sacred7Ids, setSacred7Ids] = useState<Set<string>>(new Set());
  const [sacred7Saving, setSacred7Saving] = useState(false);
  const [sacred7Error, setSacred7Error] = useState("");
  const [sacred7Success, setSacred7Success] = useState(false);
  const [sacred7Loaded, setSacred7Loaded] = useState(false);

  const loadSacred7Data = useCallback(async () => {
    try {
      const [tracksRes, sacred7Res] = await Promise.all([
        fetch("/api/tracks"),
        fetch("/api/admin/sacred7/tracks"),
      ]);
      if (tracksRes.ok) {
        const data = await tracksRes.json();
        const trackList = Array.isArray(data) ? data : data.tracks ?? [];
        setAllTracks(trackList);
      }
      if (sacred7Res.ok) {
        const data = await sacred7Res.json();
        setSacred7Ids(new Set(data.trackIds));
      }
      setSacred7Loaded(true);
    } catch {
      setSacred7Error("Failed to load tracks");
    }
  }, []);

  useEffect(() => {
    if (collection.isSacred7 || form.isSacred7) {
      loadSacred7Data();
    }
  }, [collection.isSacred7, form.isSacred7, loadSacred7Data]);

  const toggleSacred7Track = (trackId: string) => {
    setSacred7Ids((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else if (next.size < 7) {
        next.add(trackId);
      }
      return next;
    });
  };

  const saveSacred7Tracks = async () => {
    setSacred7Error("");
    setSacred7Success(false);
    setSacred7Saving(true);
    try {
      const res = await fetch("/api/admin/sacred7/tracks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds: Array.from(sacred7Ids) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSacred7Error(data.error || "Failed to save");
        return;
      }
      setSacred7Success(true);
    } catch {
      setSacred7Error("Something went wrong");
    } finally {
      setSacred7Saving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/collections")}
          className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-display text-xl font-bold text-text-primary">
            Edit Collection
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{collection.id}</p>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="glass-heavy rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Subtitle
            </label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Sort Order
            </label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
              }
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-3 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent focus:ring-accent/50"
              />
              <span className="text-sm text-text-secondary">
                Featured collection
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isSacred7}
                onChange={(e) =>
                  setForm({ ...form, isSacred7: e.target.checked })
                }
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold focus:ring-gold/50"
              />
              <span className="text-sm text-text-secondary">
                Sacred 7 collection
              </span>
              {form.isSacred7 && (
                <span className="text-[10px] text-gold bg-gold/15 px-1.5 py-0.5 rounded">
                  Free tier access
                </span>
              )}
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors resize-none"
          />
        </div>

        {/* Artwork upload */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Collection Artwork
          </label>
          <div className="flex items-start gap-4">
            {artworkPreview && (
              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={artworkPreview}
                  alt="Artwork"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <AdminFileUpload
              label="Upload artwork"
              accept="image/*"
              folder="images/artwork"
              currentFile={artworkPreview || undefined}
              onUploadComplete={({ key, cdnUrl }) => {
                setForm({ ...form, artworkKey: key });
                setArtworkPreview(cdnUrl);
              }}
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && (
          <p className="text-green-400 text-sm">Collection saved!</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent/20 border border-accent/30 text-accent rounded-xl text-sm font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Sacred 7 Track Selection — shown when this is the Sacred 7 collection */}
      {form.isSacred7 && (
        <div className="glass-heavy rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Sacred 7 Track Selection
              <span className="ml-2 text-gold text-xs font-normal">
                {sacred7Ids.size} / 7 selected
              </span>
            </h2>
            <button
              type="button"
              onClick={saveSacred7Tracks}
              disabled={sacred7Saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/20 border border-gold/30 text-gold rounded-lg text-xs font-medium hover:bg-gold/30 transition-colors disabled:opacity-50"
            >
              <Save size={12} />
              {sacred7Saving ? "Saving..." : "Save Selection"}
            </button>
          </div>

          {sacred7Error && <p className="text-red-400 text-xs mb-2">{sacred7Error}</p>}
          {sacred7Success && <p className="text-green-400 text-xs mb-2">Sacred 7 tracks saved!</p>}

          {!sacred7Loaded ? (
            <p className="text-text-muted text-sm py-4 text-center">Loading tracks...</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {allTracks.map((track) => {
                const isSelected = sacred7Ids.has(track.id);
                const isDisabled = !isSelected && sacred7Ids.size >= 7;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => toggleSacred7Track(track.id)}
                    disabled={isDisabled}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-gold/10 border border-gold/30"
                        : isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${
                        isSelected
                          ? "bg-gold/30 border-gold/50 text-gold"
                          : "border-white/20 bg-white/5"
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </span>
                    <Music size={14} className="text-text-muted flex-shrink-0" />
                    <span className="text-sm text-text-primary flex-1 text-left truncate">
                      {track.title}
                    </span>
                    {track.collectionTitle && (
                      <span className="text-[10px] text-text-dim truncate max-w-[120px]">
                        {track.collectionTitle}
                      </span>
                    )}
                    <span className="text-xs text-text-dim flex-shrink-0">
                      {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, "0")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tracks in this collection */}
      {!form.isSacred7 && (
        <div className="glass-heavy rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Tracks ({tracks.length})
            </h2>
            <button
              onClick={() => router.push("/admin/tracks")}
              className="text-xs text-accent hover:underline"
            >
              Manage Tracks →
            </button>
          </div>
          {tracks.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">
              No tracks in this collection yet.
            </p>
          ) : (
            <div className="space-y-1">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => router.push(`/admin/tracks/${track.id}`)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span className="text-xs text-text-dim w-6 text-right">
                    {track.trackNumber}
                  </span>
                  <Music size={14} className="text-text-muted" />
                  <span className="text-sm text-text-primary flex-1 text-left truncate">
                    {track.title}
                  </span>
                  <span className="text-xs text-text-dim">
                    {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
