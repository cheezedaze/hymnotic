import { NextRequest, NextResponse } from "next/server";

// Paths that are always accessible (no auth required)
const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/register",
  "/auth/accept-invite",

  "/api/auth",
  "/api/collections",
  "/api/tracks",
  "/api/user/subscription",
  "/api/stripe/webhook",
  "/subscribe",
  "/subscription",
];

// Paths that require authentication — visitors get redirected
const PROTECTED_PATHS = [
  "/profile",
  "/library",
  "/api/user/favorites",
  "/api/stripe/checkout",
  "/api/stripe/portal",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for Auth.js session cookie
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  // Protected paths require auth
  if (!hasSession && PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    const signInUrl = new URL("/auth/signin", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // All other paths (home, collection pages, about, etc.) are open to visitors
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except static files, _next internals, favicon, public assets,
    // and the upload API route (which handles its own auth and needs the body stream intact)
    "/((?!_next/static|_next/image|favicon\\.ico|icons|images|manifest|sw\\.js|workbox-|api/admin/upload).*)",
  ],
};
