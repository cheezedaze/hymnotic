import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/auth/signin", "/auth/accept-invite", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for Auth.js session cookie
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const signInUrl = new URL("/auth/signin", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except static files, _next internals, favicon, and public assets
    "/((?!_next/static|_next/image|favicon\\.ico|icons|images|manifest|sw\\.js|workbox-).*)",
  ],
};
