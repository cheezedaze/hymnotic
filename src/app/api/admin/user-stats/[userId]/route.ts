import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getUserById, getUserTopTracks } from "@/lib/db/queries";

type Period = "all" | "month" | "week" | "today";
const validPeriods: Period[] = ["all", "month", "week", "today"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "all") as Period;

    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Use: all, month, week, today" },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier: "free" | "premium" =
      user.isPremium || user.manualPremium || user.accountTier === "paid"
        ? "premium"
        : "free";

    const topTracks = await getUserTopTracks(userId, period);

    return NextResponse.json({
      period,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier,
      },
      topTracks: topTracks.map((t, i) => ({ rank: i + 1, ...t })),
    });
  } catch (error) {
    console.error("Error fetching user track stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user track stats" },
      { status: 500 }
    );
  }
}
