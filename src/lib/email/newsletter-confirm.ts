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
 * Validate a raw confirm token and, on success, add the user to the Resend
 * audience and mark them a confirmed subscriber. Resend add happens BEFORE the
 * token is marked used, so a Resend failure (which throws) leaves the token
 * reusable for a retry.
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

  await addContactToNewsletter(user.email, user.name ?? undefined);

  await db
    .update(users)
    .set({ newsletterOptIn: true, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await db
    .update(newsletterConfirmTokens)
    .set({ usedAt: new Date() })
    .where(eq(newsletterConfirmTokens.id, row.id));

  return "confirmed";
}
