import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE = "hymnotic_admin_session";
const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

// In-memory session store (sufficient for single-admin app)
// In production with multiple instances, use Redis or DB
const sessions = new Map<string, { createdAt: number }>();

/**
 * Verify a password against the ADMIN_PASSWORD env var.
 */
export function verifyPassword(input: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable is not set");
    return false;
  }
  // Constant-time comparison to prevent timing attacks
  const inputBuf = Buffer.from(input);
  const passwordBuf = Buffer.from(adminPassword);
  if (inputBuf.length !== passwordBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, passwordBuf);
}

/**
 * Create a new session and return the token.
 */
export function createSession(): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

/**
 * Validate a session token.
 */
export function validateSession(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;

  const age = (Date.now() - session.createdAt) / 1000;
  if (age > SESSION_MAX_AGE) {
    sessions.delete(token);
    return false;
  }
  return true;
}

/**
 * Destroy a session.
 */
export function destroySession(token: string): void {
  sessions.delete(token);
}

/**
 * Set the session cookie on a response.
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
 * Get the session token from cookies.
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
