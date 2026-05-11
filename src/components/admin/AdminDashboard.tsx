"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Disc3,
  Music,
  Play,
  Star,
  Plus,
  Users,
  UserPlus,
  RotateCcw,
  Activity,
} from "lucide-react";
import { Leaderboard } from "./Leaderboard";
import { TopListeners } from "./TopListeners";

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

function StatsCard({ label, value, icon: Icon, color }: StatsCardProps) {
  return (
    <div className="glass-heavy rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted text-xs font-medium">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <p className="text-2xl font-bold text-text-primary">{value.toLocaleString()}</p>
    </div>
  );
}

interface AdminDashboardProps {
  stats: {
    collections: number;
    tracks: number;
    totalPlays: number;
    featured: number;
    users: number;
    activeUsers: number;
  };
  recentTracks: Array<{
    id: string;
    title: string;
    artist: string;
    collectionId: string;
    createdAt: Date;
  }>;
}

export function AdminDashboard({ stats, recentTracks }: AdminDashboardProps) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{
    usersReset: number;
    playsDeleted: number;
    favoritesDeleted: number;
  } | null>(null);

  async function handleResetTestData() {
    if (
      !confirm(
        "This will reset all play counts and favorites for users with more than 100 plays or likes. Continue?"
      )
    )
      return;

    setResetting(true);
    setResetResult(null);
    try {
      const res = await fetch("/api/admin/reset-test-data", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setResetResult(data);
        // Refresh the page to update stats
        router.refresh();
      } else {
        alert(data.error || "Failed to reset test data");
      }
    } catch {
      alert("Failed to reset test data");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display text-2xl font-bold text-text-primary">
          Dashboard
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Manage your HYMNZ content
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatsCard
          label="Collections"
          value={stats.collections}
          icon={Disc3}
          color="text-accent"
        />
        <StatsCard
          label="Tracks"
          value={stats.tracks}
          icon={Music}
          color="text-gold"
        />
        <StatsCard
          label="Total Plays"
          value={stats.totalPlays}
          icon={Play}
          color="text-green-400"
        />
        <StatsCard
          label="Featured"
          value={stats.featured}
          icon={Star}
          color="text-yellow-400"
        />
        <StatsCard
          label="Users"
          value={stats.users}
          icon={Users}
          color="text-blue-400"
        />
        <StatsCard
          label="Active (30d)"
          value={stats.activeUsers}
          icon={Activity}
          color="text-pink-400"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push("/admin/collections")}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent/15 border border-accent/25 text-accent rounded-xl text-sm font-medium hover:bg-accent/25 transition-colors"
        >
          <Plus size={16} />
          Add Collection
        </button>
        <button
          onClick={() => router.push("/admin/tracks")}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold/15 border border-gold/25 text-gold rounded-xl text-sm font-medium hover:bg-gold/25 transition-colors"
        >
          <Plus size={16} />
          Add Track
        </button>
        <button
          onClick={() => router.push("/admin/users")}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-400/15 border border-blue-400/25 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-400/25 transition-colors"
        >
          <UserPlus size={16} />
          Invite User
        </button>
        <button
          onClick={handleResetTestData}
          disabled={resetting}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-400/15 border border-red-400/25 text-red-400 rounded-xl text-sm font-medium hover:bg-red-400/25 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={16} className={resetting ? "animate-spin" : ""} />
          {resetting ? "Resetting..." : "Reset Test Data"}
        </button>
      </div>

      {resetResult && (
        <div className="glass-heavy rounded-xl p-4 border border-green-400/25">
          <p className="text-sm text-green-400 font-medium">
            Reset complete: {resetResult.usersReset} user(s) reset,{" "}
            {resetResult.playsDeleted} play records and{" "}
            {resetResult.favoritesDeleted} favorites removed.
          </p>
        </div>
      )}

      {/* Leaderboard */}
      <Leaderboard />

      {/* Top listeners */}
      <TopListeners />

      {/* Recent tracks */}
      <div className="glass-heavy rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">
          Recent Tracks
        </h2>
        {recentTracks.length === 0 ? (
          <p className="text-text-muted text-sm py-4 text-center">
            No tracks yet. Add your first track!
          </p>
        ) : (
          <div className="space-y-1">
            {recentTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => router.push(`/admin/tracks/${track.id}`)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary">
                    {track.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {track.artist} · {track.collectionId}
                  </p>
                </div>
                <span className="text-xs text-text-dim">
                  {track.id}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
