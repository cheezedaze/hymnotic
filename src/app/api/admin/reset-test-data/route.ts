import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { resetTestData } from "@/lib/db/queries";

/**
 * POST /api/admin/reset-test-data
 * Resets play counts and favorites for users with inflated test data (>100).
 * Recalculates global track counts from remaining valid data.
 */
export async function POST() {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await resetTestData(100);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error resetting test data:", error);
    return NextResponse.json(
      { error: "Failed to reset test data" },
      { status: 500 }
    );
  }
}
