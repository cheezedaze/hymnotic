"use client";

import Image from "next/image";
import Link from "next/link";

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-dvh bg-midnight flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/images/hymnz-logo1.png"
          alt="HYMNZ"
          width={48}
          height={48}
          className="mx-auto mb-6"
        />

        <h1 className="text-display text-xl font-bold text-text-primary mb-2">
          No worries!
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          You can subscribe anytime to unlock the full catalog. In the
          meantime, enjoy your free collection and track previews.
        </p>

        <Link
          href="/"
          className="w-full py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Back to HYMNZ
        </Link>

        <Link
          href="/subscribe"
          className="block text-text-muted text-sm mt-4 hover:text-text-secondary transition-colors"
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}
