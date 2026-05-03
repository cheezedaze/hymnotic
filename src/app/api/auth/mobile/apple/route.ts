import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { upsertOAuthUser } from "@/lib/auth/oauth-upsert";
import { issueMobileSessionCookie } from "@/lib/auth/mobile-session";

/**
 * Native mobile Apple sign-in.
 *
 * iOS sends Apple's identity token (JWT signed by Apple's rotating RSA keys).
 * The audience claim equals the iOS App ID, NOT the web Service ID — so we
 * verify against `AUTH_APPLE_NATIVE_AUD` (e.g. `com.hymnz.app`), not
 * `AUTH_APPLE_ID` (the Service ID used by NextAuth's web Apple provider).
 *
 * Apple may also send `name` on the very first sign-in only; the client
 * forwards it as a top-level field since Apple's identity token never
 * contains the name.
 */
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export async function POST(req: Request) {
  let body: { idToken?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const idToken = typeof body.idToken === "string" ? body.idToken : null;
  const providedName = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
  if (!idToken) return NextResponse.json({ error: "missing_id_token" }, { status: 400 });

  const audience = process.env.AUTH_APPLE_NATIVE_AUD;
  if (!audience) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  let payload: { email?: string; email_verified?: boolean | string; sub?: string };
  try {
    const verified = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience,
    });
    payload = verified.payload as typeof payload;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  // Apple's `email_verified` arrives as the string "true" or boolean true.
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!payload.email || !emailVerified) {
    return NextResponse.json({ error: "email_not_verified" }, { status: 401 });
  }

  const user = await upsertOAuthUser({
    email: payload.email,
    name: providedName,
  });

  const cookie = await issueMobileSessionCookie(user);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
