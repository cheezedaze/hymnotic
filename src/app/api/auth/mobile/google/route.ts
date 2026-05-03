import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { upsertOAuthUser } from "@/lib/auth/oauth-upsert";
import { issueMobileSessionCookie } from "@/lib/auth/mobile-session";

/**
 * Native mobile Google sign-in.
 *
 * The iOS/Android app uses a native Google Sign-In SDK to obtain an ID token,
 * then POSTs it here. We verify the token signature, audience, issuer, and
 * email_verified claim, upsert the user, and return a NextAuth-compatible
 * session cookie. From this point the app behaves identically to a web
 * NextAuth session — middleware and `auth()` accept the same cookie.
 */
export async function POST(req: Request) {
  let body: { idToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const idToken = typeof body.idToken === "string" ? body.idToken : null;
  if (!idToken) return NextResponse.json({ error: "missing_id_token" }, { status: 400 });

  const audiences = [
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_IOS_ID,
    process.env.AUTH_GOOGLE_ANDROID_ID,
    process.env.AUTH_GOOGLE_ANDROID_UPLOAD_ID,
  ].filter((v): v is string => !!v);
  if (audiences.length === 0) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const client = new OAuth2Client();
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: audiences });
    payload = ticket.getPayload();
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  if (!payload?.email || payload.email_verified !== true) {
    return NextResponse.json({ error: "email_not_verified" }, { status: 401 });
  }

  const user = await upsertOAuthUser({
    email: payload.email,
    name: payload.name ?? null,
  });

  const cookie = await issueMobileSessionCookie(user);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
