import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE = "hymnotic_admin_session";
const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

/**
 * Get the signing secret — derived from ADMIN_PASSWORD so we don't need
 * a separate env var. The HMAC ensures the cookie can't be forged.
 */
function getSecret(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD env var is not set");
  return crypto.createHash("sha256").update(pw).digest("hex");
}

/**
 * Verify a password against the ADMIN_PASSWORD env var.
 */
export function verifyPassword(input: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable is not set");
    return false;
  }
  const inputBuf = Buffer.from(input);
  const passwordBuf = Buffer.from(adminPassword);
  if (inputBuf.length !== passwordBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, passwordBuf);
}

/**
 * Create a signed session token.
 * Format: `timestamp.signature`
 */
export function createSession(): string {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(timestamp)
    .digest("hex");
  return `${timestamp}.${signature}`;
}

/**
 * Validate a signed session token.
 * Checks signature integrity and that the token hasn't expired.
 */
export function validateSession(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  if (!timestamp || !signature) return false;

  // Verify signature
  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(timestamp)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  // Check expiry
  const created = parseInt(timestamp, 10);
  if (isNaN(created)) return false;
  const ageSeconds = (Date.now() - created) / 1000;
  return ageSeconds <= SESSION_MAX_AGE;
}

/**
 * Set the session cookie on a response (unused now but kept for reference).
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * Clear the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Get the session token from cookies (for server components).
 */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Get session token from a Request object (for API routes).
 */
export function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`${SESSION_COOKIE}=([^;]+)`)
  );
  return match?.[1] ?? null;
}

/**
 * Check if the current request is authenticated (for API routes).
 */
export function requireAdmin(request: Request): {
  authorized: boolean;
  response?: NextResponse;
} {
  const token = getSessionTokenFromRequest(request);
  if (!token || !validateSession(token)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { authorized: true };
}
