"use client";

import { useState } from "react";
import { Bell, Loader2, Send } from "lucide-react";
import { AdminInput } from "./AdminInput";
import { AdminTextarea } from "./AdminTextarea";
import { AdminModal } from "./AdminModal";
import type { PushNotification } from "@/lib/db/schema";

interface Props {
  history: PushNotification[];
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PushNotificationsManager({ history: initialHistory }: Props) {
  const [history, setHistory] = useState(initialHistory);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<
    { ok: true; sentCount: number; failedCount: number } | { ok: false; error: string } | null
  >(null);

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, sentCount: data.sentCount, failedCount: data.failedCount });
        setHistory((prev) => [
          {
            id: -Date.now(),
            title,
            body,
            sentCount: data.sentCount,
            failedCount: data.failedCount,
            createdAt: new Date(),
          },
          ...prev,
        ]);
        setTitle("");
        setBody("");
      } else {
        setResult({ ok: false, error: data.error ?? "Failed to send" });
      }
    } catch {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell size={20} className="text-accent" />
        <h1 className="text-display text-2xl font-bold text-text-primary">
          Push Notifications
        </h1>
      </div>

      <div className="glass-heavy rounded-xl p-5 space-y-4">
        <p className="text-xs text-text-muted">
          Sends a push notification to <strong>all</strong> iOS and Android app
          users with notifications enabled.
        </p>
        <AdminInput
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="e.g., New Songs Added!"
          required
        />
        <AdminTextarea
          label="Message"
          value={body}
          onChange={setBody}
          placeholder="e.g., Three new hymns just landed in Sands of the Sea."
          rows={3}
          required
        />
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!canSend}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-accent/15 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors disabled:opacity-50"
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {sending ? "Sending..." : "Send to all devices"}
        </button>

        {result &&
          (result.ok ? (
            <p className="text-sm text-green-400">
              Sent to {result.sentCount} device
              {result.sentCount === 1 ? "" : "s"}
              {result.failedCount > 0 ? `, ${result.failedCount} failed` : ""}.
            </p>
          ) : (
            <p className="text-sm text-red-400">{result.error}</p>
          ))}
      </div>

      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-2">History</h2>
        {history.length === 0 ? (
          <div className="glass-heavy rounded-xl p-8 text-center">
            <Bell size={28} className="text-text-dim mx-auto mb-3" />
            <p className="text-text-muted text-sm">No notifications sent yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((n) => (
              <div key={n.id} className="glass flex items-center gap-4 p-3 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Bell size={14} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {n.title}
                  </p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{n.body}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded inline-block">
                    {n.sentCount} sent
                    {n.failedCount > 0 ? ` · ${n.failedCount} failed` : ""}
                  </p>
                  <p className="text-[10px] text-text-dim mt-1">
                    {formatDate(n.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmOpen && (
        <AdminModal
          isOpen={confirmOpen}
          title="Send to all devices?"
          onClose={() => setConfirmOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              This sends &ldquo;<strong>{title}</strong>&rdquo; to every app user
              with notifications enabled. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 bg-white/5 text-text-secondary rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="flex-1 py-2.5 bg-accent/15 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors"
              >
                Send now
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
