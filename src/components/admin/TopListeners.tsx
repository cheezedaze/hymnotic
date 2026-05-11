"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Headphones } from "lucide-react";

type Period = "all" | "month" | "week" | "today";
type Tier = "all" | "free" | "premium";

interface ListenerEntry {
  rank: number;
  userId: string;
  email: string;
  name: string | null;
  tier: "free" | "premium";
  playCount: number;
}

interface UserStatsData {
  period: Period;
  tier: Tier;
  activeUsers: number;
  topListeners: ListenerEntry[];
}

const periodLabels: Record<Period, string> = {
  all: "All Time",
  month: "This Month",
  week: "This Week",
  today: "Today",
};

const tierLabels: Record<Tier, string> = {
  all: "All",
  free: "Free",
  premium: "Premium",
};

export function TopListeners() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("all");
  const [tier, setTier] = useState<Tier>("all");
  const [data, setData] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/user-stats?period=${period}&tier=${tier}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period, tier]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-text-primary">
          Top Listeners
        </h2>
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p
                  ? "bg-accent/15 border border-accent/25 text-accent"
                  : "text-text-muted hover:text-text-primary hover:bg-white/5"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(tierLabels) as Tier[]).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tier === t
                  ? "bg-gold/15 border border-gold/25 text-gold"
                  : "text-text-muted hover:text-text-primary hover:bg-white/5"
              }`}
            >
              {tierLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {tier === "all" && (
        <p className="text-xs text-text-muted italic">
          Counts include free users, who only have access to 7 songs.
        </p>
      )}

      <div className="glass-heavy rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Headphones size={14} className="text-accent" />
          <h3 className="text-xs font-semibold text-text-primary">
            Listeners by plays
          </h3>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : !data?.topListeners.length ? (
          <p className="text-text-muted text-xs py-4 text-center">
            No listening activity yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {data.topListeners.map((entry) => (
              <button
                key={entry.userId}
                onClick={() =>
                  router.push(`/admin/users/${entry.userId}/stats`)
                }
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-xs font-bold w-5 text-right shrink-0 ${
                      entry.rank <= 3 ? "text-accent" : "text-text-muted"
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {entry.name || entry.email}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {entry.name ? entry.email : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                      entry.tier === "premium"
                        ? "text-accent bg-accent/10"
                        : "text-text-muted bg-white/5"
                    }`}
                  >
                    {entry.tier}
                  </span>
                  <span className="text-xs font-medium text-text-dim">
                    {entry.playCount.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
