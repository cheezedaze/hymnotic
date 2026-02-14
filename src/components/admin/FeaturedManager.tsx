"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Star,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Music,
  Disc3,
} from "lucide-react";

interface FeaturedItem {
  id: number;
  type: string;
  referenceId: string;
  position: number;
  active: boolean;
}

interface TrackOption {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  collectionId: string;
}

interface CollectionOption {
  id: string;
  title: string;
  artworkUrl: string | null;
}

interface FeaturedManagerProps {
  featured: FeaturedItem[];
  tracks: TrackOption[];
  collections: CollectionOption[];
}

export function FeaturedManager({
  featured: initialFeatured,
  tracks,
  collections,
}: FeaturedManagerProps) {
  const router = useRouter();
  const [featured, setFeatured] = useState(initialFeatured);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<"track" | "collection">("track");
  const [addReferenceId, setAddReferenceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Resolve reference names
  const getReferenceName = (type: string, referenceId: string) => {
    if (type === "track") {
      const track = tracks.find((t) => t.id === referenceId);
      return track ? track.title : referenceId;
    }
    if (type === "collection") {
      const collection = collections.find((c) => c.id === referenceId);
      return collection ? collection.title : referenceId;
    }
    return referenceId;
  };

  const getReferenceArtwork = (type: string, referenceId: string) => {
    if (type === "track") {
      return tracks.find((t) => t.id === referenceId)?.artworkUrl || null;
    }
    if (type === "collection") {
      return collections.find((c) => c.id === referenceId)?.artworkUrl || null;
    }
    return null;
  };

  const handleAdd = async () => {
    if (!addReferenceId) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const nextPosition = featured.length > 0
        ? Math.max(...featured.map((f) => f.position)) + 1
        : 1;

      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: addType,
          referenceId: addReferenceId,
          position: nextPosition,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add");
        return;
      }

      const item = await res.json();
      setFeatured([...featured, item]);
      setShowAddForm(false);
      setAddReferenceId("");
      setSuccess("Featured item added!");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: FeaturedItem) => {
    try {
      const res = await fetch(`/api/admin/featured/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });

      if (res.ok) {
        setFeatured(
          featured.map((f) =>
            f.id === item.id ? { ...f, active: !f.active } : f
          )
        );
        router.refresh();
      }
    } catch {
      setError("Failed to update");
    }
  };

  const handleMove = async (item: FeaturedItem, direction: "up" | "down") => {
    const sorted = [...featured].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((f) => f.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const swapItem = sorted[swapIdx];

    try {
      await Promise.all([
        fetch(`/api/admin/featured/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: swapItem.position }),
        }),
        fetch(`/api/admin/featured/${swapItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: item.position }),
        }),
      ]);

      setFeatured(
        featured.map((f) => {
          if (f.id === item.id) return { ...f, position: swapItem.position };
          if (f.id === swapItem.id) return { ...f, position: item.position };
          return f;
        })
      );
      router.refresh();
    } catch {
      setError("Failed to reorder");
    }
  };

  const handleDelete = async (item: FeaturedItem) => {
    if (!confirm("Remove this featured item?")) return;

    try {
      const res = await fetch(`/api/admin/featured/${item.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setFeatured(featured.filter((f) => f.id !== item.id));
        setSuccess("Removed!");
        router.refresh();
      }
    } catch {
      setError("Failed to delete");
    }
  };

  const sortedFeatured = [...featured].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-gold" />
          <h1 className="text-display text-xl font-bold text-text-primary">
            Featured Content
          </h1>
          <span className="text-text-dim text-xs ml-1">
            ({featured.length} items)
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent/20 border border-accent/30 text-accent rounded-xl text-xs font-medium hover:bg-accent/30 transition-colors"
        >
          <Plus size={14} />
          Add Featured
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
          {success}
        </p>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="glass-heavy rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">
            Add Featured Item
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Type
              </label>
              <select
                value={addType}
                onChange={(e) => {
                  setAddType(e.target.value as "track" | "collection");
                  setAddReferenceId("");
                }}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              >
                <option value="track" className="bg-midnight">
                  Track
                </option>
                <option value="collection" className="bg-midnight">
                  Collection
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                {addType === "track" ? "Select Track" : "Select Collection"}
              </label>
              <select
                value={addReferenceId}
                onChange={(e) => setAddReferenceId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              >
                <option value="" className="bg-midnight">
                  Choose...
                </option>
                {addType === "track"
                  ? tracks.map((t) => (
                      <option key={t.id} value={t.id} className="bg-midnight">
                        {t.title} — {t.artist}
                      </option>
                    ))
                  : collections.map((c) => (
                      <option key={c.id} value={c.id} className="bg-midnight">
                        {c.title}
                      </option>
                    ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAdd}
                disabled={saving || !addReferenceId}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-accent/20 border border-accent/30 text-accent rounded-xl text-sm font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                {saving ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Featured list */}
      {sortedFeatured.length === 0 ? (
        <div className="glass-heavy rounded-xl p-10 text-center">
          <Star size={32} className="text-text-dim mx-auto mb-3" />
          <p className="text-text-muted text-sm">
            No featured content yet. Click &quot;Add Featured&quot; to get
            started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedFeatured.map((item, idx) => {
            const artwork = getReferenceArtwork(item.type, item.referenceId);
            return (
              <div
                key={item.id}
                className={`glass-heavy rounded-xl p-4 flex items-center gap-4 transition-opacity ${
                  !item.active ? "opacity-50" : ""
                }`}
              >
                {/* Position */}
                <span className="text-text-dim text-xs font-mono w-6 text-center shrink-0">
                  #{item.position}
                </span>

                {/* Artwork */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                  {artwork ? (
                    <Image
                      src={artwork}
                      alt=""
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.type === "track" ? (
                        <Music size={16} className="text-text-dim" />
                      ) : (
                        <Disc3 size={16} className="text-text-dim" />
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {getReferenceName(item.type, item.referenceId)}
                  </p>
                  <p className="text-xs text-text-muted capitalize">
                    {item.type}
                    {!item.active && (
                      <span className="ml-1.5 text-yellow-400">(inactive)</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMove(item, "up")}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMove(item, "down")}
                    disabled={idx === sortedFeatured.length - 1}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(item)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                    title={item.active ? "Deactivate" : "Activate"}
                  >
                    {item.active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
