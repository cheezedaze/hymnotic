"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { User, Lock, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-midnight flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }

    fetch(`/api/auth/validate-invite?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.email) {
          setEmail(data.email);
          setTokenValid(true);
        } else {
          setError(data.error || "Invalid invitation link");
        }
      })
      .catch(() => setError("Failed to validate invitation"))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // Auto sign in after account creation
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Account created but auto-login failed, redirect to sign in
        window.location.href = "/auth/signin";
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-dvh bg-midnight flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-dvh bg-midnight flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <XCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-display text-xl font-bold text-text-primary mb-2">
            Invalid Invitation
          </h1>
          <p className="text-text-muted text-sm mb-6">
            {error || "This invitation link is invalid or has expired."}
          </p>
          <a
            href="/auth/signin"
            className="text-accent text-sm hover:underline"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-midnight flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/images/think-celestial-hymnotic.svg"
            alt="Hymnotic"
            width={48}
            height={48}
            className="glow-gold mb-3"
          />
          <h1 className="text-display text-2xl font-bold text-text-primary">
            Welcome
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Set up your Hymnotic account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-heavy rounded-2xl p-6 space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Email
            </label>
            <div className="w-full px-4 py-3 bg-white/3 border border-white/8 rounded-xl text-text-muted text-sm">
              {email}
            </div>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Name
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                autoComplete="name"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-colors"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Confirm Password
            </label>
            <div className="relative">
              <CheckCircle
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name || !password || !confirmPassword}
            className="w-full py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
