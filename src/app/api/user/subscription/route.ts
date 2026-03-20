import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSacred7TrackIds } from "@/lib/auth/access";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      // Visitor — return visitor tier info
      return NextResponse.json({
        tier: "visitor",
        isPremium: false,
        sacred7TrackIds: await getSacred7TrackIds(),
      });
    }

    // Fetch fresh data from DB (not from cached JWT)
    const result = await db
      .select({
        accountTier: users.accountTier,
        isPremium: users.isPremium,
        manualPremium: users.manualPremium,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionEndDate: users.subscriptionEndDate,
        stripeCustomerId: users.stripeCustomerId,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const user = result[0];
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN";

    return NextResponse.json({
      tier: isAdmin || user.isPremium || user.manualPremium ? "paid" : "free",
      isPremium: isAdmin || user.isPremium || user.manualPremium,
      isAdmin,
      accountTier: user.accountTier,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndDate: user.subscriptionEndDate,
      hasStripeCustomer: !!user.stripeCustomerId,
      sacred7TrackIds: await getSacred7TrackIds(),
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}

