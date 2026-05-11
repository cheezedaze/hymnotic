import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getUserById } from "@/lib/db/queries";
import { UserTopTracks } from "@/components/admin/UserTopTracks";

export default async function UserStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  const tier: "free" | "premium" =
    user.isPremium || user.manualPremium || user.accountTier === "paid"
      ? "premium"
      : "free";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors mb-2"
        >
          <ChevronLeft size={14} />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-display text-2xl font-bold text-text-primary">
            {user.name || user.email}
          </h1>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
              tier === "premium"
                ? "text-accent bg-accent/10"
                : "text-text-muted bg-white/5"
            }`}
          >
            {tier}
          </span>
        </div>
        {user.name && (
          <p className="text-text-muted text-sm mt-1">{user.email}</p>
        )}
      </div>

      <UserTopTracks userId={user.id} />
    </div>
  );
}
