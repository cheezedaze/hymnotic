import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "hymnotic_admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip the login page itself
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Check for admin session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Note: We can't validate the in-memory session from middleware (runs on edge).
  // The admin layout will do full validation server-side.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
