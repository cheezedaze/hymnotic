import { auth } from "./auth";
import { db } from "@/lib/db";
import { sacred7Tracks } from "@/lib/db/schema";


export type UserTier = "visitor" | "free" | "paid";

export interface AccessContext {
  tier: UserTier;
  userId: string | null;
  isPremium: boolean;
  isAdmin: boolean;
}

export async function getAccessContext(): Promise<AccessContext> {
  const session = await auth();
  if (!session?.user) {
    return { tier: "visitor", userId: null, isPremium: false, isAdmin: false };
  }
  const isAdmin = session.user.role === "ADMIN";
  return {
    tier: isAdmin || session.user.isPremium ? "paid" : "free",
    userId: session.user.id,
    isPremium: isAdmin || (session.user.isPremium ?? false),
    isAdmin,
  };
}

/**
 * Get the track IDs belonging to the Sacred 7 collection.
 * Returns empty array if no collection is designated.
 */
export async function getSacred7TrackIds(): Promise<string[]> {
  const rows = await db
    .select({ trackId: sacred7Tracks.trackId })
    .from(sacred7Tracks);
  return rows.map((r) => r.trackId);
}

export function canPlayFullTrack(
  tier: UserTier,
  trackId: string,
  sacred7TrackIds: string[]
): boolean {
  if (tier === "paid") return true;
  if (tier === "free" && sacred7TrackIds.includes(trackId)) return true;
  return false;
}

export function getPreviewDuration(tier: UserTier): number {
  if (tier === "visitor") return 30;
  if (tier === "free") return 60;
  return Infinity;
}
