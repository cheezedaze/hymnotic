"use client";

import { useRef, useState } from "react";
import { Bell, Loader2, MessageSquare, Send } from "lucide-react";
import type { Feedback, FeedbackReply } from "@/lib/db/schema";

type Entry = Feedback & { replies: FeedbackReply[] };
type Page = { entries: Entry[]; hasMore: boolean };

function FeedbackCard({ entry }: { entry: Entry }) {
  const [replies, setReplies] = useState(entry.replies);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<{ id: string; body: string } | null>(null);

  async function send(saved?: FeedbackReply) {
    if (sending) return;
    const pending = saved ? { id: saved.id, body: saved.body } : attempt.current ?? { id: crypto.randomUUID(), body: body.trim() };
    attempt.current = pending;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/feedback/${entry.id}/reply`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send reply.");
      setReplies((previous) => [...previous.filter((reply) => reply.id !== data.id), data]);
      setBody("");
      attempt.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply.");
    } finally { setSending(false); }
  }

  return (
    <article id={entry.id} className="glass-heavy rounded-xl p-5 space-y-4 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <time dateTime={new Date(entry.createdAt).toISOString()}>{new Date(entry.createdAt).toLocaleString("en-US")}</time>
        <span>Email notification: {entry.emailNotificationStatus} · Admin push: {entry.pushNotificationStatus}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{entry.message}</p>
      <div className="border-l-2 border-accent/30 pl-4 space-y-1">
        <p className="text-xs text-accent">{entry.responseSource === "gemini" ? "Gemini acknowledgement" : "Automatic acknowledgement"}</p>
        <p className="text-sm text-text-secondary whitespace-pre-wrap">{entry.acknowledgement}</p>
      </div>
      {entry.allowContact && entry.contactEmail ? (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <p className="text-xs text-text-secondary">Follow-up permitted: <span className="break-all">{entry.contactEmail}</span></p>
          {replies.map((reply) => <div key={reply.id} className="rounded-lg bg-white/5 p-3 space-y-2">
            <p className="text-xs text-text-muted">{reply.emailId ? "Email sent" : "Delivery unconfirmed"} · {new Date(reply.createdAt).toLocaleString("en-US")}</p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">{reply.body}</p>
            {!reply.emailId && <button onClick={() => send(reply)} disabled={sending} className="text-xs text-accent disabled:opacity-50">Retry saved reply</button>}
          </div>)}
          <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="space-y-2">
            <label htmlFor={`reply-${entry.id}`} className="block text-xs text-text-secondary">Reply by email</label>
            <textarea id={`reply-${entry.id}`} value={body} onChange={(event) => { setBody(event.target.value); attempt.current = null; }} rows={3} maxLength={5000} required disabled={sending || Boolean(attempt.current)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 disabled:opacity-50" />
            <button type="submit" disabled={sending || (!body.trim() && !attempt.current)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/15 text-accent text-xs disabled:opacity-50">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}{attempt.current ? "Retry saved reply" : "Send email reply"}
            </button>
          </form>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>
      ) : <p className="text-xs text-text-dim">No permission for email follow-up.</p>}
    </article>
  );
}

export function FeedbackManager({ initialPage }: { initialPage: Page }) {
  const [entries, setEntries] = useState(initialPage.entries);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pushMessage, setPushMessage] = useState("");

  async function loadMore() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/feedback?page=${page + 1}`);
      if (!response.ok) throw new Error("Could not load more feedback. Please try again.");
      const data: Page = await response.json();
      setEntries((previous) => [...previous, ...data.entries.filter((entry) => !previous.some((item) => item.id === entry.id))]);
      setPage(page + 1); setHasMore(data.hasMore);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load feedback."); }
    finally { setLoading(false); }
  }

  async function enablePush() {
    try {
      const { registerPushNotifications } = await import("@/lib/push/registerPush");
      const enabled = await registerPushNotifications();
      setPushMessage(enabled ? "This device is registered. Personal alerts are sent only to admin@hymnotic.app." : "Open this page in the HYMNZ iOS or Android app, sign in as admin@hymnotic.app, and allow notifications in device settings.");
    } catch { setPushMessage("Could not enable notifications. Check the app's notification permissions and try again."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl font-bold text-text-primary">Feedback</h1>
        <button onClick={enablePush} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/15 text-accent text-xs"><Bell size={14} />Enable feedback notifications</button>
      </div>
      <p className="text-sm text-text-secondary">Listener feedback and acknowledgements. Email replies are available when the listener agrees to follow-up.</p>
      {pushMessage && <p role="status" className="text-sm text-accent">{pushMessage}</p>}
      {entries.length ? entries.map((entry) => <FeedbackCard key={entry.id} entry={entry} />) : <div className="glass-heavy rounded-xl p-12 text-center text-text-muted"><MessageSquare size={28} className="mx-auto mb-3" /><p className="text-sm">No feedback yet.</p></div>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {hasMore && <button onClick={loadMore} disabled={loading} className="text-sm text-accent disabled:opacity-50">{loading ? "Loading…" : "Load 20 more"}</button>}
    </div>
  );
}
