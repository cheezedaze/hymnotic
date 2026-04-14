"use client";

import { ExternalLink } from "lucide-react";
import { isNativeApp, openExternalLinkAccount } from "@/lib/utils/platform";
import { cn } from "@/lib/utils/cn";

interface SubscribeCTAProps {
  className?: string;
  size?: "sm" | "md";
}

export function SubscribeCTA({ className, size = "md" }: SubscribeCTAProps) {
  const handleClick = () => {
    if (isNativeApp()) {
      openExternalLinkAccount("https://www.hymnz.com/subscribe");
    } else {
      window.location.href = "/subscribe";
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "font-semibold rounded-xl transition-colors flex items-center justify-center gap-2",
        size === "sm"
          ? "px-4 py-2 text-sm"
          : "w-full py-3.5 text-base",
        "bg-accent-50 hover:bg-accent/60 text-white glow-accent",
        className
      )}
    >
      {isNativeApp() ? (
        <>
          <ExternalLink size={size === "sm" ? 14 : 16} />
          Visit hymnz.com
        </>
      ) : (
        "Upgrade to Premium"
      )}
    </button>
  );
}
