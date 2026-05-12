"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
    } catch {
      // Intentionally swallowed: we always show the same confirmation
      // to avoid leaking whether an account exists.
    }
    setSubmitted(true);
    setLoading(false);
  };

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
          <p className="text-text-muted text-sm mt-1">Reset your password</p>
        </div>

        {submitted ? (
          <div className="glass-heavy rounded-2xl p-6 space-y-4 text-center">
            <p className="text-text-primary text-sm">
              If an account exists for <span className="text-accent">{email}</span>,
              we&rsquo;ve sent a reset link. Check your inbox.
            </p>
            <p className="text-text-muted text-xs">
              The link expires in 1 hour.
            </p>
            <Link
              href="/auth/signin"
              className="inline-block text-accent text-sm hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="glass-heavy rounded-2xl p-6 space-y-4"
          >
            <p className="text-text-muted text-sm">
              Enter the email associated with your account and we&rsquo;ll send you
              a link to set a new password.
            </p>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </button>

            <div className="text-center">
              <Link
                href="/auth/signin"
                className="text-text-muted text-sm hover:text-text-primary transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
