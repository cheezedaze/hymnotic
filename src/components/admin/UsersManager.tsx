"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Mail,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  User,
  Crown,
  RefreshCw,
  Users,
  Bell,
  Smartphone,
  Globe,
  CreditCard,
  Gift,
  DollarSign,
} from "lucide-react";
import { DonutChart, BarStat, type DonutSegment } from "./charts/Charts";

type DevicePlatform = "ios" | "android" | "web";

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isPremium: boolean;
  manualPremium: boolean;
  accountTier: string;
  newsletterOptIn: boolean;
  pushEnabled: boolean;
  platforms: DevicePlatform[];
  createdAt: string;
}

interface UserStats {
  total: number;
  iosCount: number;
  androidCount: number;
  webOnlyCount: number;
  newsletterCount: number;
  pushCount: number;
  premiumCount: number;
  freeCount: number;
  paidCount: number;
  trialingCount: number;
  pastDueCount: number;
  compedCount: number;
  totalDevices: number;
  anonymousDevices: number;
}

interface InvitationInfo {
  id: number;
  email: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  grantPremium?: boolean;
}

interface UsersManagerProps {
  users: UserInfo[];
  invitations: InvitationInfo[];
  stats: UserStats;
}

function StatCard({
  label,
  icon: Icon,
  value,
  sub,
  color = "text-accent",
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass-heavy rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted text-xs font-medium">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

const pct = (n: number, total: number) =>
  total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;

export function UsersManager({ users, invitations, stats }: UsersManagerProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(50);
  const [email, setEmail] = useState("");
  const [grantPremium, setGrantPremium] = useState(false);
  const [sending, setSending] = useState(false);
  const [togglingPremium, setTogglingPremium] = useState<string | null>(null);
  const [syncingStripe, setSyncingStripe] = useState(false);
  const [syncingResend, setSyncingResend] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSyncStripe = async () => {
    setSyncingStripe(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/stripe/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const unmatchedCount = data.unmatched?.length ?? 0;
        setMessage({
          type: "success",
          text: `Synced ${data.updated}/${data.scanned} active Stripe subs${
            unmatchedCount > 0 ? ` (${unmatchedCount} unmatched)` : ""
          }`,
        });
        if (unmatchedCount > 0) {
          console.warn("Unmatched Stripe subscriptions:", data.unmatched);
        }
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error || "Sync failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Sync request failed" });
    } finally {
      setSyncingStripe(false);
    }
  };

  const handleSyncResend = async () => {
    setSyncingResend(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/newsletter/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const failedCount = data.failed?.length ?? 0;
        setMessage({
          type: failedCount > 0 ? "error" : "success",
          text: `Synced ${data.synced}/${data.total} opt-ins to Resend${
            failedCount > 0 ? ` (${failedCount} failed)` : ""
          }`,
        });
        if (failedCount > 0) {
          console.warn("Newsletter sync failures:", data.failed);
        }
      } else {
        setMessage({ type: "error", text: data.error || "Sync failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Sync request failed" });
    } finally {
      setSyncingResend(false);
    }
  };

  const handleTogglePremium = async (userId: string, currentManualPremium: boolean) => {
    setTogglingPremium(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/premium`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualPremium: !currentManualPremium }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to update premium" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setTogglingPremium(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSending(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), grantPremium }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.emailSent === false) {
          setMessage({
            type: "error",
            text: `Invitation created but email failed to send: ${data.emailError}`,
          });
        } else {
          setMessage({ type: "success", text: `Invitation sent to ${email}` });
        }
        setEmail("");
        setGrantPremium(false);
        router.refresh();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to send invitation" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSending(false);
    }
  };

  const pendingInvitations = invitations.filter(
    (i) => !i.usedAt && new Date(i.expiresAt) > new Date()
  );
  const expiredInvitations = invitations.filter(
    (i) => !i.usedAt && new Date(i.expiresAt) <= new Date()
  );
  const usedInvitations = invitations.filter((i) => !!i.usedAt);

  // All users split into mutually-exclusive subscription buckets (sums to total).
  const subscriptionSegments: DonutSegment[] = [
    { label: "Free", value: stats.freeCount, color: "rgba(255,255,255,0.22)" },
    { label: "Paid", value: stats.paidCount, color: "var(--color-accent)" },
    { label: "Comped", value: stats.compedCount, color: "var(--color-gold)" },
    { label: "Trialing", value: stats.trialingCount, color: "#60a5fa" },
    { label: "Past due", value: stats.pastDueCount, color: "#f87171" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl font-bold text-text-primary">
            Users
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage users and invitations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncResend}
            disabled={syncingResend}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Push all newsletter opt-ins into the Resend audience"
          >
            {syncingResend ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Mail size={14} />
            )}
            Sync to Resend
          </button>
          <button
            onClick={handleSyncStripe}
            disabled={syncingStripe}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Reconcile users against active Stripe subscriptions"
          >
            {syncingStripe ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Sync from Stripe
          </button>
        </div>
      </div>

      {/* Invite form */}
      <div className="glass-heavy rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-accent" />
          Invite User
        </h2>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={sending || !email}
              className="px-4 py-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-medium rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              Send Invite
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={grantPremium}
              onChange={(e) => setGrantPremium(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-accent focus:ring-1 focus:ring-accent/25"
            />
            <Crown size={14} className="text-gold" />
            Grant premium on signup
          </label>
        </form>
        {message && (
          <p
            className={`text-sm mt-3 ${
              message.type === "success" ? "text-green-400" : "text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* Subscriptions */}
      <div className="glass-heavy rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <CreditCard size={16} className="text-accent" />
          Subscriptions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <DonutChart
            segments={subscriptionSegments}
            centerValue={stats.total.toLocaleString()}
            centerLabel="users"
          />
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Paid Subscribers"
              icon={DollarSign}
              value={stats.paidCount.toLocaleString()}
              sub="active Stripe subs"
              color="text-accent"
            />
            <StatCard
              label="Comped"
              icon={Gift}
              value={stats.compedCount.toLocaleString()}
              sub="manually granted"
              color="text-gold"
            />
            <StatCard
              label="Premium (total)"
              icon={Crown}
              value={stats.premiumCount.toLocaleString()}
              sub={`${pct(stats.premiumCount, stats.total)} of users`}
              color="text-gold"
            />
            <StatCard
              label="Free"
              icon={Users}
              value={stats.freeCount.toLocaleString()}
              sub={`${pct(stats.freeCount, stats.total)} of users`}
              color="text-text-muted"
            />
            {stats.trialingCount > 0 && (
              <StatCard
                label="Trialing"
                icon={Crown}
                value={stats.trialingCount.toLocaleString()}
                color="text-blue-400"
              />
            )}
            {stats.pastDueCount > 0 && (
              <StatCard
                label="Past Due"
                icon={Crown}
                value={stats.pastDueCount.toLocaleString()}
                color="text-red-400"
              />
            )}
          </div>
        </div>
      </div>

      {/* Platforms & Devices */}
      <div className="glass-heavy rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Smartphone size={16} className="text-accent" />
          Platforms &amp; Devices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 self-center">
            <BarStat
              label="iPhone app"
              value={stats.iosCount}
              total={stats.total}
              color="var(--color-accent)"
            />
            <BarStat
              label="Android app"
              value={stats.androidCount}
              total={stats.total}
              color="var(--color-gold)"
            />
            <BarStat
              label="Web only"
              value={stats.webOnlyCount}
              total={stats.total}
              color="rgba(255,255,255,0.35)"
              sub="no native push registered"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 content-center">
            <StatCard
              label="Total Users"
              icon={Users}
              value={stats.total.toLocaleString()}
            />
            <StatCard
              label="Active Devices"
              icon={Smartphone}
              value={stats.totalDevices.toLocaleString()}
              sub={
                stats.anonymousDevices > 0
                  ? `${stats.anonymousDevices} anonymous (no account)`
                  : "all linked to a user"
              }
              color="text-text-secondary"
            />
          </div>
        </div>
      </div>

      {/* Engagement */}
      <div className="glass-heavy rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Bell size={16} className="text-accent" />
          Engagement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 self-center">
            <BarStat
              label="Newsletter opt-in"
              value={stats.newsletterCount}
              total={stats.total}
              color="var(--color-accent)"
            />
            <BarStat
              label="Push enabled"
              value={stats.pushCount}
              total={stats.total}
              color="var(--color-gold)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 content-center">
            <StatCard
              label="Newsletter"
              icon={Mail}
              value={stats.newsletterCount.toLocaleString()}
              sub={`${pct(stats.newsletterCount, stats.total)} opted in`}
            />
            <StatCard
              label="Push Enabled"
              icon={Bell}
              value={stats.pushCount.toLocaleString()}
              sub={`${pct(stats.pushCount, stats.total)} of users`}
            />
          </div>
        </div>
      </div>

      {/* Active users */}
      <div className="glass-heavy rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">
          Active Users ({users.length})
        </h2>
        {users.length === 0 ? (
          <p className="text-text-muted text-sm py-4 text-center">
            No users yet. Send an invitation to get started.
          </p>
        ) : (
          <div className="space-y-1">
            {users.slice(0, visible).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
                    {user.role === "ADMIN" ? (
                      <Shield size={14} className="text-accent" />
                    ) : (
                      <User size={14} className="text-accent" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {user.name || "Unnamed"}
                    </p>
                    <p className="text-xs text-text-muted">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {user.platforms.includes("ios") && (
                      <Smartphone
                        size={13}
                        className="text-accent"
                        aria-label="iPhone app"
                      >
                        <title>iPhone app</title>
                      </Smartphone>
                    )}
                    {user.platforms.includes("android") && (
                      <Smartphone
                        size={13}
                        className="text-gold"
                        aria-label="Android app"
                      >
                        <title>Android app</title>
                      </Smartphone>
                    )}
                    {!user.platforms.includes("ios") &&
                      !user.platforms.includes("android") && (
                        <Globe
                          size={13}
                          className="text-text-dim"
                          aria-label="Web only (no native push)"
                        >
                          <title>Web only (no native push)</title>
                        </Globe>
                      )}
                    <Mail
                      size={13}
                      className={
                        user.newsletterOptIn ? "text-accent" : "text-text-dim/40"
                      }
                      aria-label={
                        user.newsletterOptIn
                          ? "Newsletter subscriber"
                          : "Not subscribed to newsletter"
                      }
                    >
                      <title>
                        {user.newsletterOptIn
                          ? "Newsletter subscriber"
                          : "Not subscribed to newsletter"}
                      </title>
                    </Mail>
                    <Bell
                      size={13}
                      className={
                        user.pushEnabled ? "text-accent" : "text-text-dim/40"
                      }
                      aria-label={
                        user.pushEnabled
                          ? "Push notifications enabled"
                          : "Push notifications disabled"
                      }
                    >
                      <title>
                        {user.pushEnabled
                          ? "Push notifications enabled"
                          : "Push notifications disabled"}
                      </title>
                    </Bell>
                  </div>
                  {user.role !== "ADMIN" && (
                    <button
                      onClick={() => handleTogglePremium(user.id, user.manualPremium)}
                      disabled={togglingPremium === user.id}
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
                        user.manualPremium
                          ? "bg-gold/20 text-gold hover:bg-gold/30"
                          : "bg-white/5 text-text-dim hover:bg-white/10 hover:text-text-muted"
                      }`}
                      title={user.manualPremium ? "Revoke manual premium" : "Grant manual premium"}
                    >
                      {togglingPremium === user.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Crown size={10} />
                      )}
                      {user.manualPremium ? "Premium" : "Free"}
                    </button>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      user.role === "ADMIN"
                        ? "bg-accent/15 text-accent"
                        : "bg-white/10 text-text-muted"
                    }`}
                  >
                    {user.role}
                  </span>
                  <span className="text-xs text-text-dim">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {visible < users.length && (
              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => setVisible((v) => v + 50)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary rounded-xl text-sm transition-colors"
                >
                  Load more ({users.length - visible} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="glass-heavy rounded-xl p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Clock size={14} className="text-yellow-400" />
            Pending Invitations ({pendingInvitations.length})
          </h2>
          <div className="space-y-1">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-yellow-400" />
                  <span className="text-sm text-text-secondary">
                    {inv.email}
                  </span>
                  {inv.grantPremium && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold">
                      <Crown size={10} />
                      Premium
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-dim">
                  Expires{" "}
                  {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Used + expired invitations */}
      {(usedInvitations.length > 0 || expiredInvitations.length > 0) && (
        <div className="glass-heavy rounded-xl p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            Past Invitations ({usedInvitations.length + expiredInvitations.length})
          </h2>
          <div className="space-y-1">
            {usedInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-400" />
                  <span className="text-sm text-text-muted">{inv.email}</span>
                </div>
                <span className="text-xs text-text-dim">Accepted</span>
              </div>
            ))}
            {expiredInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-red-400" />
                  <span className="text-sm text-text-muted">{inv.email}</span>
                </div>
                <span className="text-xs text-text-dim">Expired</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
