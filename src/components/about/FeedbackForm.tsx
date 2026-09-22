"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";

export function FeedbackForm({ email }: { email: string | null }) {
  const [message, setMessage] = useState("");
  const [allowContact, setAllowContact] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<{ acknowledgement: string; responseSource: string } | null>(null);
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);

  if (!email) return (
    <div className="space-y-3 text-sm text-text-secondary">
      <p>Please send feedback on your HYMNZ experience.</p>
      <p><Link href="/auth/register?next=%2Fabout%23feedback" className="text-accent underline">Create a free account</Link>{" "}
        or <Link href="/auth/signin?next=%2Fabout%23feedback" className="text-accent underline">sign in</Link> to send feedback. You can also reach us on the social channels below.</p>
    </div>
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const res = await fetch("/api/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId.current, message, allowContact }),
      });
      if (res.status === 401) {
        window.location.href = "/auth/signin?next=%2Fabout%23feedback";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send feedback. Please try again.");
      setResponse(data);
      setMessage("");
      requestId.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback. Please try again.");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  if (response) return (
    <div className="space-y-3" role="status">
      <p className="text-xs text-accent">{response.responseSource === "gemini" ? "AI acknowledgement" : "Feedback received"}</p>
      <p className="text-sm text-text-secondary leading-relaxed">{response.acknowledgement}</p>
      <button onClick={() => setResponse(null)} className="text-sm text-accent hover:underline">Send more feedback</button>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="feedback-message" className="block text-sm text-text-secondary">Please send feedback on your HYMNZ experience</label>
      <textarea id="feedback-message" value={message} onChange={(event) => { setMessage(event.target.value); requestId.current = null; }}
        required maxLength={3000} rows={5} disabled={sending} placeholder="What has your experience been like?"
        aria-describedby="feedback-privacy feedback-length"
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 disabled:opacity-50" />
      <p id="feedback-length" className="text-right text-xs text-text-dim">{message.length.toLocaleString()} / 3,000</p>
      <label className="flex items-start gap-3 text-sm text-text-secondary">
        <input type="checkbox" checked={allowContact} disabled={sending} onChange={(event) => { setAllowContact(event.target.checked); requestId.current = null; }} className="mt-1 accent-accent" />
        <span>You may contact me at <span className="break-all">{email}</span> about this feedback. <span className="text-text-dim">Optional; this does not subscribe you to emails.</span></span>
      </label>
      <p id="feedback-privacy" className="text-xs text-text-dim">Your message is saved for the HYMNZ team and sent to Google Gemini for a brief AI acknowledgement. Please avoid including sensitive information.</p>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={sending || !message.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-accent/15 border border-accent/25 px-4 py-3 text-sm font-medium text-accent hover:bg-accent/25 disabled:opacity-50">
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{sending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
