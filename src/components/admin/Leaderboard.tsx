"use client";

import { useState, useEffect } from "react";
import { Play, Heart } from "lucide-react";

type Period = "all" | "month" | "week" | "today";

interface LeaderboardEntry {
  rank: number;
  trackId: string;
  title: string;
  collection: string;
  count: number;
}

interface LeaderboardData {
  period: Period;
  topPlays: LeaderboardEntry[];
  topFavorites: LeaderboardEntry[];
}

const periodLabels: Record<Period, string> = {
  all: "All Time",
  month: "This Month",
  week: "This Week",
  today: "Today",
};

export function Leaderboard() {
  const [period, setPeriod] = useState<Period>("all");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/leaderboard?period=${period}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          Leaderboard
        </h2>
        <div className="flex gap-1">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LeaderboardPanel
          title="Top Plays"
          icon={Play}
          entries={data?.topPlays ?? []}
          loading={loading}
          emptyMessage={
            period === "all"
              ? "No plays yet"
              : `No plays ${periodLabels[period].toLowerCase()}`
          }
        />
        <LeaderboardPanel
          title="Top Likes"
          icon={Heart}
          entries={data?.topFavorites ?? []}
          loading={loading}
          emptyMessage={
            period === "all"
              ? "No likes yet"
              : `No likes ${periodLabels[period].toLowerCase()}`
          }
        />
      </div>
    </div>
  );
}

function LeaderboardPanel({
  title,
  icon: Icon,
  entries,
  loading,
  emptyMessage,
}: {
  title: string;
  icon: React.ElementType;
  entries: LeaderboardEntry[];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <div className="glass-heavy rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-accent" />
        <h3 className="text-xs font-semibold text-text-primary">{title}</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 rounded-lg bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-text-muted text-xs py-4 text-center">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-0.5">
          {entries.map((entry) => (
            <div
              key={entry.trackId}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
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
                    {entry.title}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {entry.collection}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-text-dim shrink-0 ml-2">
                {entry.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
