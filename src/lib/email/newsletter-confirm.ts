import crypto from "crypto";
import { db } from "@/lib/db";
import { users, newsletterConfirmTokens } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { addContactToNewsletter } from "@/lib/email/newsletter";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Create a single-use confirm token for a user. Invalidates any prior unused
 * tokens for the same user. Returns the RAW token (only the hash is stored).
 */
export async function createNewsletterConfirmToken(
  userId: string
): Promise<string> {
  await db
    .update(newsletterConfirmTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(newsletterConfirmTokens.userId, userId),
        isNull(newsletterConfirmTokens.usedAt)
      )
    );

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .insert(newsletterConfirmTokens)
    .values({ userId, tokenHash, expiresAt });

  return token;
}

export type ConfirmResult = "confirmed" | "invalid" | "expired" | "already";

/**
 * Validate a raw confirm token and, on success, subscribe the user.
 *
 * Ordering is deliberate: the Resend add (an idempotent upsert) happens BEFORE
 * the token is claimed, so a Resend failure — which throws — leaves the token
 * unused and retryable. The "claim" is an atomic conditional update; a
 * concurrent double-submit (e.g. a double-clicked button) loses the claim and
 * gets "already" rather than a second "confirmed".
 */
export async function confirmNewsletterToken(
  rawToken: string
): Promise<ConfirmResult> {
  if (!rawToken) return "invalid";
  const tokenHash = sha256Hex(rawToken);

  const rows = await db
    .select()
    .from(newsletterConfirmTokens)
    .where(eq(newsletterConfirmTokens.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row) return "invalid";
  if (row.usedAt) return "already";
  if (row.expiresAt.getTime() < Date.now()) return "expired";

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  const user = userRows[0];
  if (!user) return "invalid";

  // Idempotent upsert; safe to repeat, so doing it before the claim preserves
  // retry-on-failure (a throw here leaves the token unclaimed).
  await addContactToNewsletter(user.email, user.name ?? undefined);

  // Atomic claim: only the request that flips usedAt from null wins.
  const claimed = await db
    .update(newsletterConfirmTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(newsletterConfirmTokens.id, row.id),
        isNull(newsletterConfirmTokens.usedAt)
      )
    )
    .returning({ id: newsletterConfirmTokens.id });

  if (claimed.length === 0) return "already";

  await db
    .update(users)
    .set({ newsletterOptIn: true, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return "confirmed";
}
