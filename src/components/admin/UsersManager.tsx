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
} from "lucide-react";

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface InvitationInfo {
  id: number;
  email: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

interface UsersManagerProps {
  users: UserInfo[];
  invitations: InvitationInfo[];
}

export function UsersManager({ users, invitations }: UsersManagerProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSending(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display text-2xl font-bold text-text-primary">
          Users
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Manage users and invitations
        </p>
      </div>

      {/* Invite form */}
      <div className="glass-heavy rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-accent" />
          Invite User
        </h2>
        <form onSubmit={handleInvite} className="flex gap-3">
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
            {users.map((user) => (
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
