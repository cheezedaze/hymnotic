"use client";

import { useState } from "react";
import { Video, Plus, Pencil, Trash2 } from "lucide-react";
import { AdminModal } from "./AdminModal";
import {
  extractYouTubeId,
  buildYouTubeThumbnail,
} from "@/lib/utils/youtube";

interface VideoItem {
  id: number;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  trackId: string | null;
  sortOrder: number;
}

interface TrackOption {
  id: string;
  title: string;
}

interface Props {
  videos: VideoItem[];
  tracks: TrackOption[];
}

const emptyForm = {
  title: "",
  youtubeUrl: "",
  thumbnailUrl: "",
  trackId: "",
  sortOrder: 0,
};

export function VideosManager({ videos: initialVideos, tracks }: Props) {
  const [videos, setVideos] = useState(initialVideos);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (v: VideoItem) => {
    setEditingId(v.id);
    setForm({
      title: v.title,
      youtubeUrl: v.youtubeUrl,
      thumbnailUrl: v.thumbnailUrl ?? "",
      trackId: v.trackId ?? "",
      sortOrder: v.sortOrder,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title,
      youtubeUrl: form.youtubeUrl,
      thumbnailUrl: form.thumbnailUrl || null,
      trackId: form.trackId || null,
      sortOrder: form.sortOrder,
    };

    if (editingId) {
      const res = await fetch(`/api/admin/videos/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setVideos((prev) =>
          prev.map((v) => (v.id === editingId ? updated : v))
        );
      }
    } else {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setVideos((prev) => [...prev, created]);
      }
    }
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this video?")) return;
    const res = await fetch(`/api/admin/videos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setVideos((prev) => prev.filter((v) => v.id !== id));
    }
  };

  const ytPreview = extractYouTubeId(form.youtubeUrl);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-display text-2xl font-bold text-text-primary">
          Videos
        </h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent/15 text-accent rounded-lg text-xs font-medium hover:bg-accent/25 transition-colors"
        >
          <Plus size={14} />
          Add Video
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="glass-heavy rounded-xl p-12 text-center">
          <Video size={32} className="text-text-dim mx-auto mb-3" />
          <p className="text-text-muted text-sm">No videos yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((v) => {
            const ytId = extractYouTubeId(v.youtubeUrl);
            const thumb =
              v.thumbnailUrl ||
              (ytId ? buildYouTubeThumbnail(ytId) : null);
            return (
              <div
                key={v.id}
                className="glass flex items-center gap-4 p-3 rounded-xl"
              >
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={v.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video size={16} className="text-text-dim" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {v.title}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {v.youtubeUrl}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(v)}
                    className="p-2 text-text-muted hover:text-accent transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-2 text-text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AdminModal
          isOpen={showModal}
          title={editingId ? "Edit Video" : "Add Video"}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                YouTube URL *
              </label>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(e) =>
                  setForm({ ...form, youtubeUrl: e.target.value })
                }
                placeholder="https://youtu.be/..."
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
              {ytPreview && (
                <img
                  src={buildYouTubeThumbnail(ytPreview)}
                  alt="Preview"
                  className="mt-2 rounded-lg w-full max-w-[200px]"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Linked Track (optional)
              </label>
              <select
                value={form.trackId}
                onChange={(e) =>
                  setForm({ ...form, trackId: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              >
                <option value="">None</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!form.title || !form.youtubeUrl}
              className="w-full py-2.5 bg-accent/15 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors disabled:opacity-50"
            >
              {editingId ? "Save Changes" : "Add Video"}
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
