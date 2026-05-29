import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { upsertDeviceToken } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { token, platform } = await request.json();
    if (!token || !platform) {
      return NextResponse.json(
        { error: "token and platform required" },
        { status: 400 }
      );
    }
    // Opportunistically attach a userId if a session cookie is present.
    const session = await auth().catch(() => null);
    await upsertDeviceToken({
      token,
      platform,
      userId: session?.user?.id ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error registering push token:", error);
    return NextResponse.json(
      { error: "Failed to register token" },
      { status: 500 }
    );
  }
}
