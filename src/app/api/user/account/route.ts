import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import {
  users,
  userTrackPlays,
  userFavorites,
  announcementDismissals,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe/config";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Block admin account deletion
  if ((session.user as { role?: string }).role === "ADMIN") {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted" },
      { status: 403 }
    );
  }

  const userId = session.user.id;

  // Look up user for Stripe customer ID
  const [user] = await db
    .select({
      stripeCustomerId: users.stripeCustomerId,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Cancel active Stripe subscription if exists
  if (user?.stripeCustomerId && user.subscriptionStatus === "active") {
    try {
      const stripe = getStripe();
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
      });
      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    } catch (err) {
      console.error("Failed to cancel Stripe subscription:", err);
    }
  }

  // Delete user's related data, then the user
  await db
    .delete(announcementDismissals)
    .where(eq(announcementDismissals.userId, userId));
  await db.delete(userFavorites).where(eq(userFavorites.userId, userId));
  await db.delete(userTrackPlays).where(eq(userTrackPlays.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
