"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-submits on mount so confirming takes a single click (the one in the
 * email) instead of two. The endpoint stays a POST — email security scanners
 * follow GET links but don't run JS, so they still can't auto-confirm. The
 * button remains the fallback for anyone without JS.
 */
export function ConfirmForm({ token }: { token: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action="/api/newsletter/confirm" method="POST">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        className="w-full py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors"
      >
        Confirm Subscription
      </button>
    </form>
  );
}
