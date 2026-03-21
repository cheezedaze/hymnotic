import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import { getTopTracksByPlays, getTopTracksByFavorites } from "@/lib/db/queries";

type Period = "all" | "month" | "week" | "today";
const validPeriods: Period[] = ["all", "month", "week", "today"];

/**
 * GET /api/admin/leaderboard?period=all|month|week|today
 * Returns top 10 tracks by plays and favorites for the given time period.
 */
export async function GET(request: Request) {
  const session = await requireAuthAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "all") as Period;

    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Use: all, month, week, today" },
        { status: 400 }
      );
    }

    const [topPlays, topFavorites] = await Promise.all([
      getTopTracksByPlays(period),
      getTopTracksByFavorites(period),
    ]);

    return NextResponse.json({
      period,
      topPlays: topPlays.map((t, i) => ({ rank: i + 1, ...t })),
      topFavorites: topFavorites.map((t, i) => ({ rank: i + 1, ...t })),
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
