"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-midnight" />}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Missing reset token");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        router.push("/auth/signin?reset=1");
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data?.error || "This link is invalid or has expired.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-dvh bg-midnight flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-text-primary mb-4">
            This reset link is missing or invalid.
          </p>
          <Link
            href="/auth/forgot-password"
            className="text-accent hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-midnight flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/images/hymnz-logo1.png"
            alt="HYMNZ"
            width={48}
            height={48}
            className="mb-3"
          />
          <h1 className="text-display text-2xl font-bold text-text-primary">
            HYMNZ
          </h1>
          <p className="text-text-muted text-sm mt-1">Choose a new password</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-heavy rounded-2xl p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              New password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Confirm new password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="text-center space-y-2">
              <p className="text-red-400 text-sm">{error}</p>
              <Link
                href="/auth/forgot-password"
                className="text-accent text-sm hover:underline"
              >
                Request a new link
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating...
              </>
            ) : (
              "Update password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
