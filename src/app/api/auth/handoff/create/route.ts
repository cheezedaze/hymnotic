import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { authHandoffTokens } from "@/lib/db/schema";

// One-time sign-in handoff: the native app (already authenticated in its
// WebView) mints a short-lived token here, then opens Safari to
// /api/auth/handoff/exchange so the user lands signed in without re-login.

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  if (isRateLimited(session.user.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

  await db.insert(authHandoffTokens).values({
    userId: session.user.id,
    tokenHash,
    expiresAt,
    requestedIp: ip.slice(0, 64),
  });

  return NextResponse.json({ token });
}
