import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/config";

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number;
};

function endDateFromSubscription(sub: Stripe.Subscription): Date | null {
  if (sub.cancel_at) return new Date(sub.cancel_at * 1000);
  const periodEnd = (sub as SubscriptionWithPeriod).current_period_end;
  if (periodEnd) return new Date(periodEnd * 1000);
  return null;
}

function customerIdOf(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

/**
 * Reconcile a user's premium state from a Stripe subscription.
 * Used by both the webhook handler and the admin "Sync from Stripe" backfill.
 * Respects `manualPremium`: never downgrades a user with that flag set.
 *
 * Returns true if a user row was updated, false if no matching user was found.
 */
export async function syncUserFromSubscription(
  subscription: Stripe.Subscription,
  opts: { knownUserId?: string } = {}
): Promise<boolean> {
  const userId =
    opts.knownUserId ?? (subscription.metadata?.userId as string | undefined);
  const customerId = customerIdOf(subscription);

  const isPremiumFromStripe =
    subscription.status === "active" || subscription.status === "trialing";

  const existing = userId
    ? await db
        .select({ manualPremium: users.manualPremium })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    : await db
        .select({ manualPremium: users.manualPremium })
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

  if (!existing[0]) return false;

  const isPremium = isPremiumFromStripe || existing[0].manualPremium;

  const updateData = {
    isPremium,
    accountTier: (isPremium ? "paid" : "free") as "paid" | "free",
    subscriptionStatus: subscription.status,
    subscriptionEndDate: endDateFromSubscription(subscription),
    stripeCustomerId: customerId,
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
  return true;
}

/**
 * Pull all active and trialing subscriptions from Stripe and reconcile each
 * matching user. Used by the admin "Sync from Stripe" button.
 */
export async function syncAllActiveSubscriptions(): Promise<{
  scanned: number;
  updated: number;
  unmatched: { subscriptionId: string; customerId: string; email: string | null }[];
}> {
  const stripe = getStripe();
  const statuses: Stripe.SubscriptionListParams.Status[] = ["active", "trialing"];

  let scanned = 0;
  let updated = 0;
  const unmatched: {
    subscriptionId: string;
    customerId: string;
    email: string | null;
  }[] = [];

  for (const status of statuses) {
    let startingAfter: string | undefined;
    // Paginate
    while (true) {
      const page = await stripe.subscriptions.list({
        status,
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });

      for (const sub of page.data) {
        scanned += 1;

        // Try metadata first
        let matched = await syncUserFromSubscription(sub);

        // Fall back to looking up by customer email
        if (!matched) {
          const customer =
            typeof sub.customer === "string" ? null : (sub.customer as Stripe.Customer);
          const email = customer && !customer.deleted ? customer.email : null;
          if (email) {
            const rows = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.email, email.toLowerCase()))
              .limit(1);
            if (rows[0]) {
              matched = await syncUserFromSubscription(sub, {
                knownUserId: rows[0].id,
              });
            }
          }
          if (!matched) {
            unmatched.push({
              subscriptionId: sub.id,
              customerId: customerIdOf(sub),
              email:
                customer && !customer.deleted ? customer.email ?? null : null,
            });
          }
        }

        if (matched) updated += 1;
      }

      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
      if (!startingAfter) break;
    }
  }

  return { scanned, updated, unmatched };
}
