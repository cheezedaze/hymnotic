import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { manualPremium } = await request.json();
    const grant = !!manualPremium;

    // Update manual premium flag
    await db
      .update(users)
      .set({
        manualPremium: grant,
        isPremium: grant,
        accountTier: grant ? "paid" : "free",
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    // When revoking, check if there's an active Stripe subscription
    // If so, keep isPremium true
    if (!grant) {
      const user = await db
        .select({ stripeCustomerId: users.stripeCustomerId })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (user[0]?.stripeCustomerId) {
        try {
          const subs = await getStripe().subscriptions.list({
            customer: user[0].stripeCustomerId,
            status: "active",
            limit: 1,
          });
          if (subs.data.length > 0) {
            await db
              .update(users)
              .set({ isPremium: true, accountTier: "paid" })
              .where(eq(users.id, id));
          }
        } catch {
          // Stripe check failed, keep the revoked state
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling manual premium:", error);
    return NextResponse.json(
      { error: "Failed to update premium status" },
      { status: 500 }
    );
  }
}
