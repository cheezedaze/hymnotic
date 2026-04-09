"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Music, Loader2 } from "lucide-react";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-midnight flex items-center justify-center">
          <Loader2 size={32} className="text-accent animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const loadSubscription = useSubscriptionStore((s) => s.loadSubscription);
  const [verifying, setVerifying] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;

    fetch("/api/stripe/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => {
        if (res.ok) return loadSubscription();
      })
      .catch(() => {})
      .finally(() => setVerifying(false));
  }, [sessionId, loadSubscription]);

  return (
    <div className="min-h-dvh bg-midnight flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/images/hymnz-logo1.png"
          alt="HYMNZ"
          width={48}
          height={48}
          className="mx-auto mb-4"
        />

        {verifying ? (
          <>
            <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center mx-auto mb-6">
              <Loader2 size={32} className="text-accent animate-spin" />
            </div>
            <h1 className="text-display text-2xl font-bold text-text-primary mb-2">
              Activating Your Subscription
            </h1>
            <p className="text-text-secondary text-sm mb-8">
              Please wait while we confirm your payment...
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-accent" />
            </div>
            <h1 className="text-display text-2xl font-bold text-text-primary mb-2">
              Welcome to Premium
            </h1>
            <p className="text-text-secondary text-sm mb-8">
              You now have full access to every hymn in our catalog. Enjoy
              unlimited streaming with no interruptions.
            </p>
            <Link
              href="/"
              className="w-full py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Music size={16} />
              Start Listening
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
