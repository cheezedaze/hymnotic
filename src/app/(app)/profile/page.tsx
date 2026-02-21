import { User, Settings, Palette, Volume2, Play } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getUserTotalPlays } from "@/lib/db/queries";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const totalPlays = await getUserTotalPlays(session.user.id!);

  return (
    <div className="min-h-dvh px-4 sm:px-6 pt-[calc(2rem+var(--safe-top))] pb-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile header */}
        <div className="glass-heavy rounded-2xl p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
            <User size={28} className="text-accent" />
          </div>
          <div className="flex-1">
            <h1 className="text-display text-xl font-bold text-text-primary">
              {session.user.name || "Listener"}
            </h1>
            <p className="text-text-muted text-xs mt-0.5">
              {session.user.email}
            </p>
          </div>
        </div>

        {/* Listening stats */}
        <div className="glass-heavy rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Play size={16} className="text-green-400" />
            <h2 className="text-sm font-semibold text-text-primary">
              Listening Stats
            </h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Total Plays</p>
              <p className="text-xs text-text-dim">
                Your personal play count
              </p>
            </div>
            <span className="text-lg font-bold text-accent">
              {totalPlays.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Playback Settings */}
        <div className="glass-heavy rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">
              Playback
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Auto-play</p>
                <p className="text-xs text-text-dim">
                  Automatically play the next track
                </p>
              </div>
              <div className="w-10 h-6 bg-accent/20 rounded-full relative">
                <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-accent rounded-full" />
              </div>
            </div>

            <div className="border-t border-white/5" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Show Lyrics</p>
                <p className="text-xs text-text-dim">
                  Display synchronized lyrics when available
                </p>
              </div>
              <div className="w-10 h-6 bg-accent/20 rounded-full relative">
                <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-accent rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="glass-heavy rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-gold" />
            <h2 className="text-sm font-semibold text-text-primary">
              Appearance
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Theme</p>
                <p className="text-xs text-text-dim">
                  Visual appearance of the app
                </p>
              </div>
              <span className="text-xs text-accent font-medium px-2.5 py-1 bg-accent/10 rounded-lg">
                Midnight
              </span>
            </div>
          </div>
        </div>

        {/* App info */}
        <div className="glass-heavy rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">
              About
            </h2>
          </div>
          <div className="space-y-2 text-xs text-text-dim">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="text-text-muted">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Build</span>
              <span className="text-text-muted">Next.js</span>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <SignOutButton />
      </div>
    </div>
  );
}
