import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getActiveUserCount, getTopListeners } from "@/lib/db/queries";

type Period = "all" | "month" | "week" | "today";
type Tier = "all" | "free" | "premium";

const validPeriods: Period[] = ["all", "month", "week", "today"];
const validTiers: Tier[] = ["all", "free", "premium"];

export async function GET(request: Request) {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "all") as Period;
    const tier = (searchParams.get("tier") || "all") as Tier;

    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Use: all, month, week, today" },
        { status: 400 }
      );
    }
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Use: all, free, premium" },
        { status: 400 }
      );
    }

    const [activeUsers, topListeners] = await Promise.all([
      getActiveUserCount(period),
      getTopListeners(period, tier),
    ]);

    return NextResponse.json({
      period,
      tier,
      activeUsers,
      topListeners: topListeners.map((l, i) => ({ rank: i + 1, ...l })),
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}
