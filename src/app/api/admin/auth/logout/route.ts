import { NextResponse } from "next/server";
import {
  getSessionTokenFromRequest,
  destroySession,
  clearSessionCookie,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  const token = getSessionTokenFromRequest(request);
  if (token) {
    destroySession(token);
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
