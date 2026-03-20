"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

export function EditableName({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) {
      setName(initialName);
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setName(initialName);
              setEditing(false);
            }
          }}
          className="bg-white/5 border border-accent/30 rounded-lg px-3 py-1 text-xl font-bold text-text-primary text-display outline-none focus:border-accent/60 w-full max-w-[200px]"
          disabled={saving}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 text-green-400 hover:text-green-300 transition-colors"
        >
          <Check size={18} />
        </button>
        <button
          onClick={() => {
            setName(initialName);
            setEditing(false);
          }}
          className="p-1 text-text-muted hover:text-text-secondary transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-display text-xl font-bold text-text-primary">
        {initialName || "Listener"}
      </h1>
      <button
        onClick={() => setEditing(true)}
        className="p-1 text-text-dim opacity-0 group-hover:opacity-100 hover:text-accent transition-all"
        title="Edit name"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}
