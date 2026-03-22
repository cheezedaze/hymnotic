"use client";

import { useEffect } from "react";
import { Eye, X } from "lucide-react";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import { useAudioPlayer } from "@/lib/hooks/useAudioPlayer";
import { useMediaSession } from "@/lib/hooks/useMediaSession";
import { useIsDesktop } from "@/lib/hooks/useIsDesktop";
import { MobileLayout } from "./MobileLayout";
import { DesktopLayout } from "./DesktopLayout";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { ShareSheet } from "@/components/share/ShareSheet";
import { WhatsNewChecker } from "@/components/announcements/WhatsNewChecker";

const tierLabels: Record<string, string> = {
  visitor: "Visitor",
  free: "Free Subscriber",
  paid: "Premium Subscriber",
};

function ViewAsBar() {
  const isAdmin = useSubscriptionStore((s) => s.isAdmin);
  const viewAsOverride = useSubscriptionStore((s) => s.viewAsOverride);
  const setViewAsOverride = useSubscriptionStore((s) => s.setViewAsOverride);
  const isDesktop = useIsDesktop();

  if (!isAdmin || !viewAsOverride) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 py-1.5 px-4 bg-gold/15 border-b border-gold/25 text-gold text-xs font-medium"
      style={isDesktop ? { paddingLeft: "15rem" } : undefined}
    >
      <Eye size={13} />
      <span>Viewing as: {tierLabels[viewAsOverride] ?? viewAsOverride}</span>
      <button
        onClick={() => setViewAsOverride(null)}
        className="ml-1 p-0.5 rounded hover:bg-gold/20 transition-colors"
        title="Reset to admin view"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useAudioPlayer();
  useMediaSession();

  // Load subscription state and favorites on mount
  useEffect(() => {
    useSubscriptionStore.getState().loadSubscription();
    useFavoritesStore.getState().loadFavorites();
  }, []);

  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <>
        <ViewAsBar />
        <DesktopLayout>{children}</DesktopLayout>
        <UpgradeModal />
        <ShareSheet />
        <WhatsNewChecker />
      </>
    );
  }

  return (
    <>
      <ViewAsBar />
      <MobileLayout>{children}</MobileLayout>
      <UpgradeModal />
      <ShareSheet />
      <WhatsNewChecker />
    </>
  );
}
