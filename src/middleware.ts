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
  "/api/promo",

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

  // Promo attribution: stamp a ref cookie so signups from promo pages are
  // attributable (read by the register route / OAuth upsert).
  if (pathname === "/another-testament") {
    const utmSource = request.nextUrl.searchParams.get("utm_source");
    // Sanitize to a safe charset: raw query text can carry null bytes (breaks
    // the Postgres insert at signup) or split surrogates (breaks cookie
    // encoding) — and never let attribution block a signup.
    const cleaned = utmSource
      ?.toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 24);
    const ref = cleaned ? `another-testament:${cleaned}` : "another-testament";
    const response = NextResponse.next();
    response.cookies.set("hymnz_ref", ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

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
