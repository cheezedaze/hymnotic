import { NextResponse } from "next/server";
import crypto from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { authHandoffTokens, users } from "@/lib/db/schema";
import { issueMobileSessionCookie } from "@/lib/auth/mobile-session";
import { getSafeNextPath } from "@/lib/utils/safe-redirect";

// Exchange a one-time handoff token (minted by /api/auth/handoff/create in the
// native WebView) for a real web session cookie, then redirect into the app.
// Opened in external Safari, which has no session of its own.

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const next = getSafeNextPath(url.searchParams.get("next"), "/subscribe");

  // On any failure, fall back to a normal sign-in (no scary error page).
  const signinUrl = new URL(
    `/auth/signin?next=${encodeURIComponent(next)}`,
    url.origin
  );

  if (!token) {
    return NextResponse.redirect(signinUrl, { status: 303 });
  }

  const tokenHash = sha256Hex(token);
  const rows = await db
    .select()
    .from(authHandoffTokens)
    .where(
      and(
        eq(authHandoffTokens.tokenHash, tokenHash),
        isNull(authHandoffTokens.usedAt),
        gt(authHandoffTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.redirect(signinUrl, { status: 303 });
  }

  // Single-use: consume the token before issuing the session.
  await db
    .update(authHandoffTokens)
    .set({ usedAt: new Date() })
    .where(eq(authHandoffTokens.id, row.id));

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    return NextResponse.redirect(signinUrl, { status: 303 });
  }

  const cookie = await issueMobileSessionCookie(user);
  const res = NextResponse.redirect(new URL(next, url.origin), { status: 303 });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
