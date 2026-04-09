import { NextRequest, NextResponse } from "next/server";

// TEMPORARY: All pages gated behind auth until public launch.
// To revert, restore the original PROTECTED_PATHS approach.

// Paths that are always accessible without authentication
const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/register",
  "/auth/accept-invite",

  "/api/auth",
  "/api/ads",
  "/api/banner-ads",
  "/api/collections",
  "/api/tracks",
  "/api/user/subscription",
  "/api/stripe/webhook",
  "/subscribe",
  "/subscription",

  "/privacy",
  "/terms",
  "/track/",
  "/s/",
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

  // Gate everything else behind auth
  if (!hasSession) {
    const signInUrl = new URL("/auth/signin", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except static files, _next internals, favicon, public assets,
    // and the upload API route (which handles its own auth and needs the body stream intact)
    "/((?!_next/static|_next/image|favicon\\.ico|icons|images|manifest|sw\\.js|workbox-|api/admin/upload).*)",
  ],
};
