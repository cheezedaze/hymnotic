"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Send,
  CircleOff,
} from "lucide-react";
import { AdminModal } from "./AdminModal";
import type { Announcement } from "@/lib/db/schema";
import { noAnnouncementAction, parseAnnouncementAction } from "@/lib/announcements/actions";

// Dynamic import TipTap to avoid SSR issues
const TipTapEditor = dynamic(
  () => import("./TipTapEditor").then((mod) => ({ default: mod.TipTapEditor })),
  { ssr: false, loading: () => <div className="h-40 bg-white/5 rounded-xl animate-pulse" /> }
);

interface Props {
  announcements: Announcement[];
}

const emptyForm = {
  title: "",
  body: "",
  ...noAnnouncementAction,
};

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AnnouncementsManager({
  announcements: initialAnnouncements,
}: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tracks, setTracks] = useState<{ id: string; title: string; artist: string }[]>([]);
  const [trackError, setTrackError] = useState("");

  useEffect(() => {
    if (!showModal || form.actionType !== "track") return;
    const controller = new AbortController();
    setTrackError("");
    fetch("/api/tracks", { signal: controller.signal }).then(async (res) => {
      if (!res.ok) throw new Error("Could not load tracks. Close and reopen this form to retry.");
      setTracks(await res.json());
    }).catch((err) => {
      if (!controller.signal.aborted) setTrackError(err.message);
    });
    return () => controller.abort();
  }, [showModal, form.actionType]);

  const openCreate = () => {
    setError("");
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: Announcement) => {
    setError("");
    setEditingId(a.id);
    setForm({ title: a.title, body: a.body, actionType: a.actionType, actionTrackId: a.actionTrackId, actionUrl: a.actionUrl, actionLabel: a.actionLabel });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.body) return;
    setSaving(true);
    setError("");

    try {
      const payload = { title: form.title, body: form.body, ...parseAnnouncementAction(form) };
      if (editingId) {
        const res = await fetch(`/api/admin/announcements/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Could not save announcement.");
        if (res.ok) {
          const updated = await res.json();
          setAnnouncements((prev) =>
            prev.map((a) => (a.id === editingId ? updated : a))
          );
        }
      } else {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Could not save announcement.");
        if (res.ok) {
          const created = await res.json();
          setAnnouncements((prev) => [created, ...prev]);
        }
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this announcement? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const togglePublish = async (a: Announcement) => {
    const publishedAt = a.publishedAt ? null : new Date().toISOString();
    const res = await fetch(`/api/admin/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishedAt }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAnnouncements((prev) =>
        prev.map((item) => (item.id === a.id ? updated : item))
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-display text-2xl font-bold text-text-primary">
          Updates
        </h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent/15 text-accent rounded-lg text-xs font-medium hover:bg-accent/25 transition-colors"
        >
          <Plus size={14} />
          Add Announcement
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="glass-heavy rounded-xl p-12 text-center">
          <Megaphone size={32} className="text-text-dim mx-auto mb-3" />
          <p className="text-text-muted text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="glass flex items-center gap-4 p-3 rounded-xl"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Megaphone size={14} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {a.title}
                  </p>
                  {a.publishedAt ? (
                    <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                      Published {formatDate(a.publishedAt)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-dim bg-white/5 px-1.5 py-0.5 rounded">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {stripHtml(a.body).slice(0, 80)}
                  {stripHtml(a.body).length > 80 ? "..." : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => togglePublish(a)}
                  className={`p-2 transition-colors ${
                    a.publishedAt
                      ? "text-green-400 hover:text-green-300"
                      : "text-text-dim hover:text-accent"
                  }`}
                  title={a.publishedAt ? "Unpublish" : "Publish"}
                >
                  {a.publishedAt ? <Send size={14} /> : <CircleOff size={14} />}
                </button>
                <button
                  onClick={() => openEdit(a)}
                  className="p-2 text-text-muted hover:text-accent transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-2 text-text-muted hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AdminModal
          isOpen={showModal}
          title={editingId ? "Edit Announcement" : "New Announcement"}
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
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., New Songs Added!"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Content *
              </label>
              <TipTapEditor
                initialContent={form.body}
                onUpdate={(html) => setForm((prev) => ({ ...prev, body: html }))}
              />
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-text-secondary">
                Optional button
                <select value={form.actionType ?? ""} onChange={(e) => setForm({ ...form, ...noAnnouncementAction, actionType: (e.target.value || null) as typeof form.actionType })}
                  className="mt-1.5 w-full px-3 py-2.5 bg-midnight border border-white/10 rounded-xl text-sm text-text-primary">
                  <option value="">None</option><option value="track">Play a track</option><option value="link">Open a link / video</option>
                </select>
              </label>
              {form.actionType === "track" && <>
                <label className="block text-xs font-medium text-text-secondary">
                  Track
                  <select value={form.actionTrackId ?? ""} onChange={(e) => setForm({ ...form, actionTrackId: e.target.value })}
                    className="mt-1.5 w-full px-3 py-2.5 bg-midnight border border-white/10 rounded-xl text-sm text-text-primary">
                    <option value="">Choose a released track…</option>
                    {form.actionTrackId && !tracks.some((track) => track.id === form.actionTrackId) && <option value={form.actionTrackId}>Selected track: {form.actionTrackId}</option>}
                    {tracks.map((track) => <option key={track.id} value={track.id}>{track.title} — {track.artist}</option>)}
                  </select>
                </label>
                <p className="text-xs text-text-muted">Shows Play Now and Dismiss. While a song is playing, also shows Add to Up Next.</p>
                {trackError && <p role="alert" className="text-xs text-red-400">{trackError}</p>}
              </>}
              {form.actionType === "link" && <>
                <label className="block text-xs font-medium text-text-secondary">Button text
                  <input value={form.actionLabel ?? ""} maxLength={60} placeholder="Watch Video" onChange={(e) => setForm({ ...form, actionLabel: e.target.value })}
                    className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary" />
                </label>
                <label className="block text-xs font-medium text-text-secondary">Destination
                  <input value={form.actionUrl ?? ""} placeholder="https://… or /about" onChange={(e) => setForm({ ...form, actionUrl: e.target.value })}
                    className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary" />
                </label>
              </>}
            </div>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <button
              onClick={handleSave}
              disabled={!form.title || !stripHtml(form.body) || saving}
              className="w-full py-2.5 bg-accent/15 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Save Changes"
                : "Create Announcement"}
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
