"use client";

import { useState } from "react";
import { Settings, Save, Check } from "lucide-react";

interface Props {
  settings: Record<string, string>;
}

const settingLabels: Record<string, { label: string; description: string }> = {
  artvue_link_url: {
    label: "Artvue Link URL",
    description: "The URL that the artwork Artvue link points to",
  },
  artvue_link_text: {
    label: "Artvue Link Text",
    description: "Display text for the Artvue link on the Artwork tab",
  },
};

export function SettingsManager({ settings: initialSettings }: Props) {
  const [values, setValues] = useState<Record<string, string>>({
    artvue_link_url: initialSettings.artvue_link_url ?? "",
    artvue_link_text:
      initialSettings.artvue_link_text ??
      "Get this artwork on your TV at Artvue.io",
    ...initialSettings,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: values[key] }),
      });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  };

  const settingKeys = Object.keys(settingLabels);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-accent" />
        <h1 className="text-display text-2xl font-bold text-text-primary">
          Settings
        </h1>
      </div>

      <div className="space-y-4">
        {settingKeys.map((key) => {
          const meta = settingLabels[key];
          return (
            <div key={key} className="glass rounded-xl p-4 space-y-2">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  {meta.label}
                </label>
                <p className="text-xs text-text-muted">{meta.description}</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={values[key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                />
                <button
                  onClick={() => handleSave(key)}
                  disabled={saving === key}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-accent/15 text-accent rounded-xl text-xs font-medium hover:bg-accent/25 transition-colors disabled:opacity-50"
                >
                  {saved === key ? <Check size={14} /> : <Save size={14} />}
                  {saved === key ? "Saved" : "Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
