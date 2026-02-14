"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Pencil, Trash2, Disc3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CollectionRow {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  artworkUrl: string | null;
  artworkKey: string | null;
  featured: boolean;
  sortOrder: number;
  trackCount: number;
}

interface CollectionsManagerProps {
  collections: CollectionRow[];
}

export function CollectionsManager({ collections }: CollectionsManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    title: "",
    subtitle: "",
    description: "",
    sortOrder: collections.length + 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create collection");
        return;
      }

      setShowForm(false);
      setForm({ id: "", title: "", subtitle: "", description: "", sortOrder: collections.length + 2 });
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this collection?")) return;
    setDeleting(id);

    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete");
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
            Collections
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {collections.length} collection{collections.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent/15 border border-accent/25 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors"
        >
          <Plus size={16} />
          New Collection
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="glass-heavy rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-text-primary">
            New Collection
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                placeholder="e.g., sands-of-the-sea"
                required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Collection title"
                required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
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
                placeholder="Short tagline"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
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
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Collection description"
              rows={2}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-accent/20 border border-accent/30 text-accent rounded-xl text-sm font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Collection"}
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

      {/* Collections list */}
      <div className="space-y-2">
        {collections.length === 0 ? (
          <div className="glass-heavy rounded-xl p-8 text-center">
            <Disc3 size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">
              No collections yet. Create your first one!
            </p>
          </div>
        ) : (
          collections.map((collection) => (
            <div
              key={collection.id}
              className="glass rounded-xl px-4 py-3 flex items-center gap-4"
            >
              {/* Artwork */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                {collection.artworkUrl ? (
                  <Image
                    src={collection.artworkUrl}
                    alt={collection.title}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc3 size={20} className="text-text-dim" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {collection.title}
                  </p>
                  {collection.featured && (
                    <span className="px-1.5 py-0.5 bg-gold/15 text-gold text-[10px] font-medium rounded">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {collection.subtitle || "No subtitle"} ·{" "}
                  {collection.trackCount} track{collection.trackCount !== 1 ? "s" : ""} ·{" "}
                  Order: {collection.sortOrder}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => router.push(`/admin/collections/${collection.id}`)}
                  className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-accent transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(collection.id)}
                  disabled={deleting === collection.id}
                  className={cn(
                    "p-2 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors",
                    deleting === collection.id && "opacity-50"
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
