"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

type Update = { id: number; title: string; body: string; publishedAt: string; dateEstimated: boolean };

export function UpdateHistoryTab() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const load = useCallback(async (before?: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/announcements/history${before ? `?cursor=${before}` : ""}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load updates.");
      setUpdates((previous) => before ? [...previous, ...data.announcements.filter((item: Update) => !previous.some((entry) => entry.id === item.id))] : data.announcements);
      setCursor(data.nextCursor); setLoaded(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load updates. Please try again."); }
    finally { inFlight.current = false; setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6 text-left" aria-busy={loading}>
      {updates.map((update, index) => <Fragment key={update.id}>
        {index > 0 && <hr className="border-white/10" />}
        <article className="space-y-3">
          <header>
            <h2 className="text-display text-lg font-semibold text-text-primary">{update.title}</h2>
            <p className="text-xs text-text-dim mt-1">{update.dateEstimated ? "Approx. " : ""}<time dateTime={update.publishedAt}>{new Date(update.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></p>
          </header>
          <div className="prose prose-invert prose-sm max-w-none break-words [&_p]:text-text-secondary [&_ul]:text-text-secondary [&_ol]:text-text-secondary [&_a]:text-accent [&_img]:rounded-lg [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: update.body }} />
        </article>
      </Fragment>)}
      {loading && <p role="status" className="text-sm text-text-muted">Loading updates…</p>}
      {loaded && !updates.length && <p className="text-sm text-text-muted">No updates yet.</p>}
      {error && <div role="alert" className="space-y-2"><p className="text-sm text-red-400">{error}</p><button onClick={() => load(cursor ?? undefined)} className="text-sm text-accent">Try again</button></div>}
      {cursor && !error && <button onClick={() => load(cursor)} disabled={loading} className="rounded-lg px-4 py-2 bg-accent/15 text-accent text-sm disabled:opacity-50">Load 20 more</button>}
    </div>
  );
}
