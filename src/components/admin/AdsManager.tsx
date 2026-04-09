"use client";

import { useState } from "react";
import { ImagePlus, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { AdminModal } from "./AdminModal";
import { AdminFileUpload } from "./AdminFileUpload";

function getAdImageUrl(key: string | null): string | null {
  if (!key) return null;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnUrl) return `${cdnUrl}/${key}`;
  return null;
}

interface AdItem {
  id: number;
  title: string;
  imageKey: string;
  linkUrl: string | null;
  active: boolean;
  sortOrder: number;
}

interface Props {
  ads: AdItem[];
}

const emptyForm = {
  title: "",
  imageKey: "",
  linkUrl: "",
  active: true,
  sortOrder: 0,
};

export function AdsManager({ ads: initialAds }: Props) {
  const [ads, setAds] = useState(initialAds);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (ad: AdItem) => {
    setEditingId(ad.id);
    setForm({
      title: ad.title,
      imageKey: ad.imageKey,
      linkUrl: ad.linkUrl ?? "",
      active: ad.active,
      sortOrder: ad.sortOrder,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title,
      imageKey: form.imageKey,
      linkUrl: form.linkUrl || null,
      active: form.active,
      sortOrder: form.sortOrder,
    };

    if (editingId) {
      const res = await fetch(`/api/admin/ads/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setAds((prev) =>
          prev.map((a) => (a.id === editingId ? updated : a))
        );
      }
    } else {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setAds((prev) => [...prev, created]);
      }
    }
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this ad?")) return;
    const res = await fetch(`/api/admin/ads/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAds((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleToggleActive = async (ad: AdItem) => {
    const res = await fetch(`/api/admin/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !ad.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAds((prev) => prev.map((a) => (a.id === ad.id ? updated : a)));
    }
  };

  const imagePreviewUrl = form.imageKey ? getAdImageUrl(form.imageKey) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-2xl font-bold text-text-primary">
            Ads
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage rotating background ads shown to free users on Sacred Seven songs.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent/15 text-accent rounded-lg text-xs font-medium hover:bg-accent/25 transition-colors"
        >
          <Plus size={14} />
          Add Ad
        </button>
      </div>

      {ads.length === 0 ? (
        <div className="glass-heavy rounded-xl p-12 text-center">
          <ImagePlus size={32} className="text-text-dim mx-auto mb-3" />
          <p className="text-text-muted text-sm">No ads yet. Add your first ad to show on free songs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => {
            const imgUrl = getAdImageUrl(ad.imageKey);
            return (
              <div
                key={ad.id}
                className="glass rounded-xl overflow-hidden group"
              >
                <div className="relative aspect-[9/16] bg-white/5">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={ad.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImagePlus size={24} className="text-text-dim" />
                    </div>
                  )}
                  {!ad.active && (
                    <div className="absolute inset-0 bg-midnight/60 flex items-center justify-center">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Inactive
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {ad.title}
                    </p>
                    <button
                      onClick={() => handleToggleActive(ad)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${
                        ad.active ? "bg-accent" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                          ad.active ? "left-4" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  {ad.linkUrl && (
                    <p className="text-xs text-text-dim truncate flex items-center gap-1">
                      <ExternalLink size={10} />
                      {ad.linkUrl}
                    </p>
                  )}
                  <div className="flex gap-1 pt-1">
                    <button
                      onClick={() => openEdit(ad)}
                      className="p-1.5 text-text-muted hover:text-accent transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(ad.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AdminModal
          isOpen={showModal}
          title={editingId ? "Edit Ad" : "Add Ad"}
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
                placeholder="e.g. Spring Campaign"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <AdminFileUpload
              label="Ad Image *"
              accept="image/*"
              folder="images/misc"
              currentFile={imagePreviewUrl ?? undefined}
              onUploadComplete={({ key }) =>
                setForm({ ...form, imageKey: key })
              }
            />
            <p className="text-[10px] text-text-dim -mt-2">
              Recommended: 1080x1920px (portrait) or 1080x1080px (square)
            </p>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Link URL (optional)
              </label>
              <input
                type="url"
                value={form.linkUrl}
                onChange={(e) =>
                  setForm({ ...form, linkUrl: e.target.value })
                }
                placeholder="https://example.com"
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
                  setForm({
                    ...form,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-text-secondary">
                Active
              </label>
              <button
                onClick={() => setForm({ ...form, active: !form.active })}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  form.active ? "bg-accent" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    form.active ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={!form.title || !form.imageKey}
              className="w-full py-2.5 bg-accent/15 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors disabled:opacity-50"
            >
              {editingId ? "Save Changes" : "Add Ad"}
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
