"use client";

import Link from "next/link";
import { Shield, Eye, Crown, UserCheck, UserX } from "lucide-react";
import { useSubscriptionStore, type UserTier } from "@/lib/store/subscriptionStore";

const viewOptions: { tier: UserTier | null; label: string; icon: typeof Shield }[] = [
  { tier: null, label: "Admin (Default)", icon: Shield },
  { tier: "paid", label: "Premium Subscriber", icon: Crown },
  { tier: "free", label: "Free Subscriber", icon: UserCheck },
  { tier: "visitor", label: "Visitor", icon: UserX },
];

export function AdminViewSwitcher() {
  const isAdmin = useSubscriptionStore((s) => s.isAdmin);
  const viewAsOverride = useSubscriptionStore((s) => s.viewAsOverride);
  const setViewAsOverride = useSubscriptionStore((s) => s.setViewAsOverride);

  if (!isAdmin) return null;

  const currentOverride = viewAsOverride;

  return (
    <div className="glass-heavy rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-accent" />
        <h2 className="text-sm font-semibold text-text-primary">Admin</h2>
      </div>

      <Link
        href="/admin"
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition-colors"
      >
        <Shield size={16} />
        Admin Dashboard
      </Link>

      <div className="border-t border-white/5 pt-3">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={14} className="text-text-muted" />
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            View as
          </p>
        </div>
        <div className="space-y-1">
          {viewOptions.map(({ tier, label, icon: Icon }) => {
            const isActive = currentOverride === tier;
            return (
              <button
                key={label}
                onClick={() => setViewAsOverride(tier)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                }`}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 1.5} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
