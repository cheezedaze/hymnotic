import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { priceId: planType } = await request.json();

    // Map plan type to Stripe price ID
    let priceId: string;
    if (planType === "yearly") {
      priceId = STRIPE_CONFIG.yearlyPriceId;
    } else {
      priceId = STRIPE_CONFIG.monthlyPriceId;
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid plan selection" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const userResult = await db
      .select({
        stripeCustomerId: users.stripeCustomerId,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: session.user.id },
      });
      stripeCustomerId = customer.id;

      await db
        .update(users)
        .set({ stripeCustomerId, updatedAt: new Date() })
        .where(eq(users.id, session.user.id));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hymnz.com";

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscription/cancel`,
      metadata: { userId: session.user.id },
      subscription_data: {
        metadata: { userId: session.user.id },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
