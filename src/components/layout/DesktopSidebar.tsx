"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Home, Library, User, LogOut, Shield, Crown, UserCheck, UserX, Eye } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BrandHeader } from "@/components/layout/BrandHeader";
import { signOut } from "next-auth/react";
import { useSubscriptionStore, type UserTier } from "@/lib/store/subscriptionStore";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/profile", icon: User, label: "Profile" },
];

interface SessionUser {
  name?: string | null;
  email?: string | null;
}

const viewOptions: { tier: UserTier | null; label: string; icon: typeof Shield }[] = [
  { tier: null, label: "Admin (Default)", icon: Shield },
  { tier: "paid", label: "Premium", icon: Crown },
  { tier: "free", label: "Free", icon: UserCheck },
  { tier: "visitor", label: "Visitor", icon: UserX },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = useSubscriptionStore((s) => s.isAdmin);
  const viewAsOverride = useSubscriptionStore((s) => s.viewAsOverride);
  const setViewAsOverride = useSubscriptionStore((s) => s.setViewAsOverride);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const overrideLabel = viewAsOverride
    ? viewOptions.find((o) => o.tier === viewAsOverride)?.label
    : null;

  return (
    <aside className="fixed top-0 left-0 w-60 h-dvh flex flex-col bg-midnight-deep border-r border-white/6 z-30">
      {/* Logo */}
      <div className="px-3 pt-6 pb-4">
        <Link href="/" className="block">
          <BrandHeader variant="sidebar" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-accent-dim text-accent"
                      : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
                  )}
                >
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={cn(
                      isActive &&
                        "drop-shadow-[0_0_6px_rgba(0,255,251,0.4)]"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
          {/* More / About */}
          <li>
            <Link
              href="/about"
              prefetch={false}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                pathname === "/about"
                  ? "bg-accent-dim text-accent"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
              )}
            >
              <Image
                src="/images/hymnz-logo1.png"
                alt=""
                width={20}
                height={20}
                className={cn(
                  "w-5 h-5 shrink-0 object-contain",
                  pathname === "/about" &&
                    "drop-shadow-[0_0_6px_rgba(0,255,251,0.4)]"
                )}
                aria-hidden
              />
              More
            </Link>
          </li>
        </ul>
      </nav>

      {/* Account */}
      <div className="px-3 pb-6 mt-auto relative" ref={menuRef}>
        {/* Admin popover menu */}
        {menuOpen && isAdmin && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1a2030] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-accent hover:bg-white/[0.06] transition-colors"
            >
              <Shield size={16} />
              Admin Dashboard
            </Link>

            <div className="border-t border-white/6 mx-3" />

            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center gap-1.5 mb-2">
                <Eye size={12} className="text-text-dim" />
                <span className="text-[10px] font-medium text-text-dim uppercase tracking-wider">
                  View as
                </span>
              </div>
            </div>

            {viewOptions.map(({ tier, label, icon: Icon }) => {
              const isActive = viewAsOverride === tier;
              return (
                <button
                  key={label}
                  onClick={() => {
                    setViewAsOverride(tier);
                    setMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent/12 text-accent font-medium"
                      : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                  )}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 1.5} />
                  {label}
                </button>
              );
            })}
            <div className="h-2" />
          </div>
        )}

        <div className="border-t border-white/6 pt-4">
          {/* Active override indicator */}
          {isAdmin && overrideLabel && (
            <div className="flex items-center gap-2 px-4 mb-3">
              <Eye size={12} className="text-gold shrink-0" />
              <span className="text-[10px] font-medium text-gold truncate">
                Viewing as: {overrideLabel}
              </span>
            </div>
          )}

          {user ? (
            <div
              className={cn(
                "flex items-center gap-3 px-4",
                isAdmin && "cursor-pointer rounded-xl py-2 -my-2 hover:bg-white/[0.04] transition-colors"
              )}
              onClick={isAdmin ? () => setMenuOpen(!menuOpen) : undefined}
            >
              <div className="w-8 h-8 rounded-full bg-accent-16 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                {(user.name || user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user.name || "User"}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  signOut();
                }}
                className="text-text-dim hover:text-text-muted transition-colors shrink-0"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="flex items-center gap-3 px-4 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              <User size={18} />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
