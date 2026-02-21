"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Music, Library, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Music, label: "Music" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/profile", icon: User, label: "Profile" },
];

interface SessionUser {
  name?: string | null;
  email?: string | null;
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="fixed top-0 left-0 w-60 h-dvh flex flex-col bg-midnight-deep border-r border-white/6 z-30">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-8 h-8 shrink-0"
            style={{
              maskImage: "url(/images/think-celestial-hymnotic.svg)",
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskImage: "url(/images/think-celestial-hymnotic.svg)",
              WebkitMaskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              backgroundColor: "var(--color-accent)",
            }}
            aria-hidden
          />
          <span className="text-display text-xl font-bold text-text-primary">
            Hymnotic
          </span>
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
              <div
                className={cn(
                  "w-5 h-5 shrink-0",
                  pathname === "/about" &&
                    "drop-shadow-[0_0_6px_rgba(0,255,251,0.4)]"
                )}
                style={{
                  maskImage: "url(/images/think-celestial-hymnotic.svg)",
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskImage:
                    "url(/images/think-celestial-hymnotic.svg)",
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  backgroundColor:
                    pathname === "/about"
                      ? "var(--color-accent)"
                      : "currentColor",
                }}
                aria-hidden
              />
              More
            </Link>
          </li>
        </ul>
      </nav>

      {/* Account */}
      <div className="px-3 pb-6 mt-auto">
        <div className="border-t border-white/6 pt-4">
          {user ? (
            <div className="flex items-center gap-3 px-4">
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
                onClick={() => signOut()}
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
