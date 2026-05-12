"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

function getShareUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://www.hymnz.com")
  );
}

export function OnboardingStepShare() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = getShareUrl();
    const shareData = {
      title: "HYMNZ",
      text: "I've been listening to hymns on HYMNZ — thought you might love it too.",
      url,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or failed — fall through
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // last resort: do nothing
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-accent-16 flex items-center justify-center glow-accent">
          <Share2 size={24} className="text-accent" />
        </div>
        <h2
          id="onboarding-step-title"
          className="text-display text-2xl font-semibold text-text-primary"
        >
          Share HYMNZ
        </h2>
        <p className="text-sm text-text-secondary max-w-sm">
          Know someone who&apos;d love this? A quick share goes a long way in
          helping HYMNZ grow.
        </p>
      </div>

      <button
        type="button"
        onClick={handleShare}
        className={cn(
          "w-full py-3.5 rounded-xl font-semibold text-base text-white",
          "bg-accent-50 hover:bg-accent/60 glow-accent transition-colors",
          "flex items-center justify-center gap-2"
        )}
      >
        {copied ? (
          <>
            <Check size={18} />
            Link copied
          </>
        ) : (
          <>
            <Share2 size={18} />
            Share with a friend
          </>
        )}
      </button>
    </div>
  );
}
