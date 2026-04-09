"use client";

import { useState } from "react";
import { Image as ImageIcon, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { AdminModal } from "./AdminModal";
import { AdminFileUpload } from "./AdminFileUpload";

function getBannerImageUrl(key: string | null): string | null {
  if (!key) return null;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnUrl) return `${cdnUrl}/${key}`;
  return null;
}

interface BannerAdItem {
  id: number;
  title: string;
  imageKey: string;
  linkUrl: string | null;
  active: boolean;
  sortOrder: number;
}

interface Props {
  bannerAds: BannerAdItem[];
}

const emptyForm = {
  title: "",
  imageKey: "",
  linkUrl: "",
  active: true,
  sortOrder: 0,
};

export function BannerAdsManager({ bannerAds: initialBanners }: Props) {
  const [banners, setBanners] = useState(initialBanners);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (b: BannerAdItem) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      imageKey: b.imageKey,
      linkUrl: b.linkUrl ?? "",
      active: b.active,
      sortOrder: b.sortOrder,
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
      const res = await fetch(`/api/admin/banner-ads/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setBanners((prev) =>
          prev.map((b) => (b.id === editingId ? updated : b))
        );
      }
    } else {
      const res = await fetch("/api/admin/banner-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setBanners((prev) => [...prev, created]);
      }
    }
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this banner ad?")) return;
    const res = await fetch(`/api/admin/banner-ads/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setBanners((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const handleToggleActive = async (b: BannerAdItem) => {
    const res = await fetch(`/api/admin/banner-ads/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBanners((prev) =>
        prev.map((item) => (item.id === b.id ? updated : item))
      );
    }
  };

  const imagePreviewUrl = form.imageKey
    ? getBannerImageUrl(form.imageKey)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-2xl font-bold text-text-primary">
            Banner Ads
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Horizontal image banners shown to free users at the top of pages and
            in the player. Recommended size:{" "}
            <span className="text-text-secondary font-medium">
              1200 × 200 px
            </span>
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent/15 text-accent rounded-lg text-xs font-medium hover:bg-accent/25 transition-colors"
        >
          <Plus size={14} />
          Add Banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div className="glass-heavy rounded-xl p-12 text-center">
          <ImageIcon size={32} className="text-text-dim mx-auto mb-3" />
          <p className="text-text-muted text-sm">
            No banner ads yet. Add your first banner to display to free users.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => {
            const imgUrl = getBannerImageUrl(b.imageKey);
            return (
              <div
                key={b.id}
                className="glass rounded-xl overflow-hidden"
              >
                {/* Banner preview */}
                <div className="relative aspect-[6/1] bg-white/5">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={b.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={24} className="text-text-dim" />
                    </div>
                  )}
                  {!b.active && (
                    <div className="absolute inset-0 bg-midnight/60 flex items-center justify-center">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Inactive
                      </span>
                    </div>
                  )}
                </div>

                {/* Info row */}
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {b.title}
                    </p>
                    {b.linkUrl && (
                      <p className="text-xs text-text-dim truncate flex items-center gap-1 mt-0.5">
                        <ExternalLink size={10} />
                        {b.linkUrl}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleActive(b)}
                    className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${
                      b.active ? "bg-accent" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                        b.active ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => openEdit(b)}
                    className="p-1.5 text-text-muted hover:text-accent transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
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
          title={editingId ? "Edit Banner" : "Add Banner"}
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
                placeholder="e.g. Spring Sale Banner"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <AdminFileUpload
              label="Banner Image *"
              accept="image/*"
              folder="images/misc"
              currentFile={imagePreviewUrl ?? undefined}
              onUploadComplete={({ key }) =>
                setForm({ ...form, imageKey: key })
              }
            />
            <p className="text-[10px] text-text-dim -mt-2">
              Recommended: 1200 × 200 px (6:1 ratio)
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
              {editingId ? "Save Changes" : "Add Banner"}
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
