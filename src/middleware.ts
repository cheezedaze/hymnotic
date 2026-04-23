import { NextRequest, NextResponse } from "next/server";

// Paths that are always accessible without authentication.
// Everything not matching PROTECTED_PATHS is also open to visitors — this list
// is mainly for sign-in/register flows, webhooks, and routes that need to be
// explicitly allowed even if they live under a protected namespace.
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
  "/account/delete",
  "/track/",
  "/s/",
];

// Paths that require authentication — visitors get redirected (or 401 for API).
const PROTECTED_PATHS = [
  "/profile",
  "/library",
  "/admin",
  "/api/user",
  "/api/favorites",
  "/api/stripe/checkout",
  "/api/stripe/portal",
  "/api/admin",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths first (takes precedence over PROTECTED_PATHS prefix match,
  // so e.g. /api/user/subscription stays public while /api/user/* is protected).
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for Auth.js session cookie
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (hasSession) {
    return NextResponse.next();
  }

  // API routes return 401 JSON so clients handle it cleanly
  // (redirects break non-GET fetches with 405).
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const signInUrl = new URL("/auth/signin", request.url);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    // Match everything except static files, _next internals, favicon, public assets,
    // and the upload API route (which handles its own auth and needs the body stream intact)
    "/((?!_next/static|_next/image|favicon\\.ico|icons|images|manifest|sw\\.js|workbox-|api/admin/upload).*)",
  ],
};
