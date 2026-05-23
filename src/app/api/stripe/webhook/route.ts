import { NextResponse } from "next/server";
import { getStripe, getStripeConfig } from "@/lib/stripe/config";
import { db } from "@/lib/db";
import { users, stripeEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { syncUserFromSubscription } from "@/lib/stripe/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    let webhookSecret: string;
    try {
      webhookSecret = getStripeConfig().webhookSecret;
    } catch (err) {
      // Missing/empty STRIPE_WEBHOOK_SECRET — return 500 so the operator sees it
      // in logs and Stripe retries, rather than silently 400-ing every request.
      console.error("Stripe webhook misconfigured:", err);
      return NextResponse.json(
        { error: "Webhook misconfigured" },
        { status: 500 }
      );
    }

    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(
        "Webhook signature verification failed (secret length:",
        webhookSecret.length,
        "):",
        err
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("Stripe webhook received:", event.type, event.id);

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

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncUserFromSubscription(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvicePaid(event.data.object as Stripe.Invoice);
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
    console.error("No userId in checkout session metadata", session.id);
    return;
  }

  // Pull the subscription so we can record the end date in one shot.
  let subscription: Stripe.Subscription | null = null;
  if (session.subscription) {
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
    try {
      subscription = await getStripe().subscriptions.retrieve(subId);
    } catch (err) {
      console.error("Failed to retrieve subscription for checkout session:", err);
    }
  }

  if (subscription) {
    await syncUserFromSubscription(subscription, { knownUserId: userId });
    return;
  }

  // Fallback when there's no subscription on the session (e.g. one-time payment)
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

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Check if user has manual premium before downgrading
  const existing = userId
    ? await db.select({ manualPremium: users.manualPremium }).from(users).where(eq(users.id, userId)).limit(1)
    : await db.select({ manualPremium: users.manualPremium }).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);

  const hasManualPremium = existing[0]?.manualPremium ?? false;

  const updateData = {
    isPremium: hasManualPremium,
    accountTier: hasManualPremium ? ("paid" as const) : ("free" as const),
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

async function handleInvicePaid(invoice: Stripe.Invoice) {
  // Renewals: pull the subscription and re-sync the user so isPremium stays
  // true and subscriptionEndDate moves forward.
  const subscriptionRef = (
    invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
  ).subscription;
  if (!subscriptionRef) return;
  const subId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;
  try {
    const subscription = await getStripe().subscriptions.retrieve(subId);
    await syncUserFromSubscription(subscription);
  } catch (err) {
    console.error("Failed to handle invoice.paid:", err);
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
