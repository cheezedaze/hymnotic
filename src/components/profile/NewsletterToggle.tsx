"use client";

import { useState, useEffect } from "react";

export function NewsletterToggle() {
  const [optedIn, setOptedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncWarning, setSyncWarning] = useState(false);

  useEffect(() => {
    fetch("/api/user/newsletter")
      .then((res) => res.json())
      .then((data) => {
        setOptedIn(data.newsletterOptIn);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const newValue = !optedIn;
    setOptedIn(newValue);
    setSyncWarning(false);
    try {
      const res = await fetch("/api/user/newsletter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterOptIn: newValue }),
      });
      if (!res.ok) {
        setOptedIn(!newValue);
        return;
      }
      const data = await res.json();
      // Preference saved, but the Resend sync failed — surface it instead of
      // silently dropping it (this was the cause of DB/Resend drift).
      setSyncWarning(data.resendSynced === false);
    } catch {
      setOptedIn(!newValue);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-between animate-pulse">
        <div>
          <div className="h-4 w-24 bg-white/5 rounded" />
          <div className="h-3 w-48 bg-white/5 rounded mt-1" />
        </div>
        <div className="w-10 h-6 bg-white/5 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-text-secondary">Newsletter</p>
        <p className="text-xs text-text-dim">
          Receive updates about new music and HYMNZ news
        </p>
        {syncWarning && (
          <p className="text-xs text-yellow-400 mt-1">
            Saved, but we couldn&apos;t update our mailing list right now. We&apos;ll
            sync it shortly.
          </p>
        )}
      </div>
      <button
        onClick={toggle}
        className={`w-10 h-6 rounded-full relative transition-colors ${
          optedIn ? "bg-accent/20" : "bg-white/10"
        }`}
        aria-label={optedIn ? "Unsubscribe from newsletter" : "Subscribe to newsletter"}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
            optedIn
              ? "right-0.5 bg-accent"
              : "left-0.5 bg-white/30"
          }`}
        />
      </button>
    </div>
  );
}
