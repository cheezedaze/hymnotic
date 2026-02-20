"use client";

import { useState } from "react";
import { FileText, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { AdminModal } from "./AdminModal";

interface ContentBlock {
  id: number;
  page: string;
  sectionKey: string;
  title: string;
  body: string;
  icon: string | null;
  sortOrder: number;
  active: boolean;
}

interface Props {
  blocks: ContentBlock[];
  defaultPage: string;
}

const emptyForm = {
  page: "about",
  sectionKey: "",
  title: "",
  bodyText: "",
  icon: "",
  sortOrder: 0,
  active: true,
};

export function ContentManager({
  blocks: initialBlocks,
  defaultPage,
}: Props) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm, page: defaultPage });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, page: defaultPage });
    setShowModal(true);
  };

  const openEdit = (b: ContentBlock) => {
    setEditingId(b.id);
    setForm({
      page: b.page,
      sectionKey: b.sectionKey,
      title: b.title,
      bodyText: b.body,
      icon: b.icon ?? "",
      sortOrder: b.sortOrder,
      active: b.active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      page: form.page,
      sectionKey: form.sectionKey,
      title: form.title,
      bodyText: form.bodyText,
      icon: form.icon || null,
      sortOrder: form.sortOrder,
      active: form.active,
    };

    if (editingId) {
      const res = await fetch(`/api/admin/content/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setBlocks((prev) =>
          prev.map((b) => (b.id === editingId ? updated : b))
        );
      }
    } else {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setBlocks((prev) => [...prev, created]);
      }
    }
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this content block?")) return;
    const res = await fetch(`/api/admin/content/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const toggleActive = async (b: ContentBlock) => {
    const res = await fetch(`/api/admin/content/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBlocks((prev) =>
        prev.map((item) => (item.id === b.id ? updated : item))
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-display text-2xl font-bold text-text-primary">
          Content
        </h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent/15 text-accent rounded-lg text-xs font-medium hover:bg-accent/25 transition-colors"
        >
          <Plus size={14} />
          Add Block
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="glass-heavy rounded-xl p-12 text-center">
          <FileText size={32} className="text-text-dim mx-auto mb-3" />
          <p className="text-text-muted text-sm">No content blocks yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((b) => (
              <div
                key={b.id}
                className={`glass flex items-center gap-4 p-3 rounded-xl ${
                  !b.active ? "opacity-50" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-accent">
                    {b.sortOrder}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {b.title}
                    </p>
                    <span className="text-[10px] text-text-dim bg-white/5 px-1.5 py-0.5 rounded">
                      {b.sectionKey}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {b.body.slice(0, 80)}...
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleActive(b)}
                    className={`p-2 transition-colors ${
                      b.active
                        ? "text-accent hover:text-accent/70"
                        : "text-text-dim hover:text-text-muted"
                    }`}
                  >
                    {b.active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="p-2 text-text-muted hover:text-accent transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-2 text-text-muted hover:text-red-400 transition-colors"
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
          title={editingId ? "Edit Content Block" : "Add Content Block"}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Section Key *
                </label>
                <input
                  type="text"
                  value={form.sectionKey}
                  onChange={(e) =>
                    setForm({ ...form, sectionKey: e.target.value })
                  }
                  placeholder="e.g., mission, story"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Icon (Lucide name)
                </label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) =>
                    setForm({ ...form, icon: e.target.value })
                  }
                  placeholder="e.g., Heart, BookOpen"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            </div>
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
                Body *
              </label>
              <textarea
                value={form.bodyText}
                onChange={(e) =>
                  setForm({ ...form, bodyText: e.target.value })
                }
                rows={5}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-xs text-text-secondary">Active</span>
                </label>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={
                !form.sectionKey || !form.title || !form.bodyText
              }
              className="w-full py-2.5 bg-accent/15 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors disabled:opacity-50"
            >
              {editingId ? "Save Changes" : "Add Block"}
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
