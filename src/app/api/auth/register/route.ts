import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createNewsletterConfirmToken } from "@/lib/email/newsletter-confirm";
import { sendNewsletterConfirmEmail } from "@/lib/email/resend";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { isRateLimited } from "@/lib/security/rate-limit";

const HONEYPOT_FIELD = "company";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, newsletterOptIn, turnstileToken } = body;
    const honeypot = body[HONEYPOT_FIELD];

    // 1. Honeypot — real users never fill this hidden field. Generic error.
    if (typeof honeypot === "string" && honeypot.trim() !== "") {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // 2. Best-effort rate limit by IP.
    if (isRateLimited(`register:${ip}`)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    // 3. Turnstile — enforced when a token is present (a present-but-invalid
    //    token is a strong bot signal, so reject it). When the token is absent
    //    (widget blocked/failed for a legit user), degrade to the honeypot +
    //    rate limit above rather than locking everyone out.
    const token = typeof turnstileToken === "string" ? turnstileToken : "";
    if (token) {
      const turnstileOk = await verifyTurnstileToken(token, ip);
      if (!turnstileOk) {
        return NextResponse.json(
          { error: "Verification failed. Please try again." },
          { status: 400 }
        );
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser[0]) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    // newsletterOptIn stays false until the user confirms (double opt-in).
    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      name: name?.trim() || null,
      passwordHash,
      role: "USER",
      accountTier: "free",
      isPremium: false,
      newsletterOptIn: false,
    });

    // 4. Double opt-in: send a confirm email instead of adding to Resend now.
    if (newsletterOptIn === true) {
      try {
        const token = await createNewsletterConfirmToken(userId);
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333";
        const confirmUrl = `${appUrl}/auth/confirm-newsletter?token=${token}`;
        await sendNewsletterConfirmEmail(
          normalizedEmail,
          confirmUrl,
          name?.trim() || undefined
        );
      } catch (err) {
        console.error("Failed to send newsletter confirmation email:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
