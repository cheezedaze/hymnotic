import { create } from "zustand";
import { type ApiTrack } from "@/lib/types";

export type UserTier = "visitor" | "free" | "paid";

/** Preview duration by tier (mirrors server-side getPreviewDuration) */
function getPreviewDurationForTier(tier: UserTier): number {
  if (tier === "visitor") return 30;
  if (tier === "free") return 60;
  return Infinity;
}

/** Recompute isLocked/previewDuration on tracks for a given tier + sacred7 list */
export function recomputeTrackAccess(
  tracks: ApiTrack[],
  tier: UserTier,
  sacred7Ids: string[]
): ApiTrack[] {
  const previewDur = getPreviewDurationForTier(tier);
  return tracks.map((t) => {
    const isFull =
      tier === "paid" || (tier === "free" && sacred7Ids.includes(t.id));
    return {
      ...t,
      isLocked: !isFull,
      previewDuration: isFull ? t.duration : previewDur,
    };
  });
}

interface SubscriptionState {
  tier: UserTier;
  isPremium: boolean;
  sacred7TrackIds: string[];
  isLoaded: boolean;
  isAdmin: boolean;
  viewAsOverride: UserTier | null;

  setTier: (tier: UserTier) => void;
  setIsPremium: (isPremium: boolean) => void;
  setSacred7TrackIds: (ids: string[]) => void;
  setViewAsOverride: (tier: UserTier | null) => void;
  loadSubscription: () => Promise<void>;
  canPlayFull: (trackId: string) => boolean;
  effectiveTier: () => UserTier;
}

function loadOverrideFromSession(): UserTier | null {
  if (typeof window === "undefined") return null;
  const val = sessionStorage.getItem("hymnz_view_as");
  if (val === "visitor" || val === "free" || val === "paid") return val;
  return null;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: "visitor",
  isPremium: false,
  sacred7TrackIds: [],
  isLoaded: false,
  isAdmin: false,
  viewAsOverride: loadOverrideFromSession(),

  setTier: (tier) => set({ tier }),
  setIsPremium: (isPremium) => set({ isPremium }),
  setSacred7TrackIds: (ids) => set({ sacred7TrackIds: ids }),
  setViewAsOverride: (overrideTier) => {
    if (typeof window !== "undefined") {
      if (overrideTier) {
        sessionStorage.setItem("hymnz_view_as", overrideTier);
      } else {
        sessionStorage.removeItem("hymnz_view_as");
      }
    }
    set({ viewAsOverride: overrideTier });

    // Recompute the current player track's preview state for the new tier
    const effectiveTier = overrideTier ?? get().tier;
    const { sacred7TrackIds } = get();
    try {
      const { usePlayerStore } = require("@/lib/store/playerStore");
      const playerState = usePlayerStore.getState();
      if (playerState.currentTrack) {
        const [updated] = recomputeTrackAccess(
          [playerState.currentTrack],
          effectiveTier,
          sacred7TrackIds
        );
        const isPreview = updated.isLocked ?? false;
        const previewDur = isPreview ? (updated.previewDuration ?? null) : null;
        usePlayerStore.setState({
          currentTrack: updated,
          isPreviewMode: isPreview,
          previewDuration: previewDur,
          previewCheckpoint: previewDur,
          isPreviewEnded: false,
          showUpgradeModal: false,
          showPreviewActions: false,
        });
      }
    } catch {
      // playerStore may not be available during SSR
    }
  },

  loadSubscription: async () => {
    try {
      const res = await fetch("/api/user/subscription");
      if (!res.ok) {
        set({ tier: "visitor", isPremium: false, isLoaded: true, isAdmin: false });
        return;
      }

      const data = await res.json();
      set({
        tier: data.tier || "visitor",
        isPremium: data.isPremium || false,
        sacred7TrackIds: data.sacred7TrackIds || [],
        isLoaded: true,
        isAdmin: data.isAdmin || false,
      });
    } catch {
      set({ tier: "visitor", isPremium: false, isLoaded: true, isAdmin: false });
    }
  },

  effectiveTier: () => {
    const { viewAsOverride, tier } = get();
    return viewAsOverride ?? tier;
  },

  canPlayFull: (trackId: string) => {
    const { sacred7TrackIds } = get();
    const tier = get().effectiveTier();
    if (tier === "paid") return true;
    if (tier === "free" && sacred7TrackIds.includes(trackId)) return true;
    return false;
  },
}));
