import { NextResponse } from "next/server";
import { getStripe, STRIPE_CONFIG } from "@/lib/stripe/config";
import { db } from "@/lib/db";
import { users, stripeEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        body,
        signature,
        STRIPE_CONFIG.webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Idempotency check
    const existing = await db
      .select({ id: stripeEvents.id })
      .from(stripeEvents)
      .where(eq(stripeEvents.stripeEventId, event.id))
      .limit(1);

    if (existing[0]) {
      return NextResponse.json({ received: true });
    }

    // Log the event
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      processed: false,
      payload: JSON.stringify(event.data.object),
    });

    // Process the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    // Mark as processed
    await db
      .update(stripeEvents)
      .set({ processed: true })
      .where(eq(stripeEvents.stripeEventId, event.id));

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  await db
    .update(users)
    .set({
      isPremium: true,
      accountTier: "paid",
      subscriptionStatus: "active",
      stripeCustomerId: session.customer as string,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    // Try to find user by stripeCustomerId
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    await updateUserByCustomerId(customerId, subscription);
    return;
  }

  const isPremium =
    subscription.status === "active" || subscription.status === "trialing";

  await db
    .update(users)
    .set({
      isPremium,
      accountTier: isPremium ? "paid" : "free",
      subscriptionStatus: subscription.status,
      subscriptionEndDate: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const updateData = {
    isPremium: false,
    accountTier: "free" as const,
    subscriptionStatus: null as string | null,
    subscriptionEndDate: null as Date | null,
    updatedAt: new Date(),
  };

  if (userId) {
    await db.update(users).set(updateData).where(eq(users.id, userId));
  } else {
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.stripeCustomerId, customerId));
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  await db
    .update(users)
    .set({
      subscriptionStatus: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(users.stripeCustomerId, customerId));
}

async function updateUserByCustomerId(
  customerId: string,
  subscription: Stripe.Subscription
) {
  const isPremium =
    subscription.status === "active" || subscription.status === "trialing";

  await db
    .update(users)
    .set({
      isPremium,
      accountTier: isPremium ? "paid" : "free",
      subscriptionStatus: subscription.status,
      subscriptionEndDate: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(users.stripeCustomerId, customerId));
}
