import { encode } from "@auth/core/jwt";
import type { User } from "@/lib/db/schema";

const SESSION_COOKIE_NAME = "authjs.session-token";
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

/**
 * Build a JWT payload that mirrors what NextAuth's `jwt({ token, user })`
 * callback in auth.ts produces, then sign and encrypt it the same way
 * NextAuth does for web sessions. The resulting cookie is byte-compatible
 * with NextAuth-issued cookies, so middleware and `auth()` work unchanged.
 */
export async function issueMobileSessionCookie(user: User): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");

  const token = await encode({
    salt: SESSION_COOKIE_NAME,
    secret,
    maxAge: SESSION_MAX_AGE_SEC,
    token: {
      sub: user.id,
      email: user.email,
      name: user.name ?? null,
      id: user.id,
      role: user.role,
      accountTier: user.accountTier,
      isPremium: user.isPremium || user.manualPremium,
      subscriptionStatus: user.subscriptionStatus,
    },
  });

  const attrs = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
  ];
  return attrs.join("; ");
}
