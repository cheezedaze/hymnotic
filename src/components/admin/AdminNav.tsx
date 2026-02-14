"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Disc3,
  Music,
  Star,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/collections", label: "Collections", icon: Disc3 },
  { href: "/admin/tracks", label: "Tracks", icon: Music },
  { href: "/admin/featured", label: "Featured", icon: Star },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <nav className="glass-heavy border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/think-celestial-hymnotic.svg"
              alt="Hymnotic"
              width={24}
              height={24}
              className="glow-gold"
            />
            <span className="text-display text-sm font-bold text-text-primary">
              Admin
            </span>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    isActive
                      ? "bg-accent/15 text-accent"
                      : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                  )}
                >
                  <item.icon size={14} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
