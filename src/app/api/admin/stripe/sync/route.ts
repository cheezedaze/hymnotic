import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { syncAllActiveSubscriptions } from "@/lib/stripe/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireAuthAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllActiveSubscriptions();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Stripe sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", detail: String(error) },
      { status: 500 }
    );
  }
}
