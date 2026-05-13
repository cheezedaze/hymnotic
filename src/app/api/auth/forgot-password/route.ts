import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sendPasswordResetEmail } from "@/lib/email/resend";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitBuckets = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = (rateLimitBuckets.get(key) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  bucket.push(now);
  rateLimitBuckets.set(key, bucket);
  return bucket.length > RATE_LIMIT_MAX;
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(request: Request) {
  const start = Date.now();

  try {
    const { email } = await request.json();
    const normalizedEmail =
      typeof email === "string" ? email.toLowerCase().trim() : "";

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const limited =
      !normalizedEmail || isRateLimited(`${ip}:${normalizedEmail}`);

    if (limited) {
      console.warn("forgot-password: rate-limited", { ip });
    } else {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      const user = userResult[0];

      if (user) {
        await db
          .update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(
            and(
              eq(passwordResetTokens.userId, user.id),
              isNull(passwordResetTokens.usedAt)
            )
          );

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = sha256Hex(token);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash,
          expiresAt,
          requestedIp: ip.slice(0, 64),
        });

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333";
        const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

        try {
          await sendPasswordResetEmail(normalizedEmail, resetUrl);
        } catch (err) {
          console.error("forgot-password: email send failed", err);
        }
      }
    }
  } catch (err) {
    console.error("forgot-password: unexpected error", err);
  }

  const elapsed = Date.now() - start;
  const minMs = 250;
  if (elapsed < minMs) {
    await new Promise((r) => setTimeout(r, minMs - elapsed));
  }

  return NextResponse.json({ ok: true });
}
