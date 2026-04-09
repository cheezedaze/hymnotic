"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Disc3,
  Music,
  Star,
  Video,
  FileText,
  Megaphone,
  Settings,
  LogOut,
  Users,
  ChevronDown,
  ImagePlus,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavDropdown {
  label: string;
  icon: LucideIcon;
  items: NavLink[];
}

type NavEntry = NavLink | NavDropdown;

function isDropdown(entry: NavEntry): entry is NavDropdown {
  return "items" in entry;
}

const navEntries: NavEntry[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Music",
    icon: Music,
    items: [
      { href: "/admin/collections", label: "Collections", icon: Disc3 },
      { href: "/admin/tracks", label: "Tracks", icon: Music },
      { href: "/admin/featured", label: "Featured", icon: Star },
      { href: "/admin/videos", label: "Videos", icon: Video },
    ],
  },
  {
    label: "Content",
    icon: FileText,
    items: [
      { href: "/admin/content", label: "Content", icon: FileText },
      { href: "/admin/announcements", label: "Updates", icon: Megaphone },
    ],
  },
  {
    label: "Engagement",
    icon: Users,
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/ads", label: "Ads", icon: ImagePlus },
      { href: "/admin/banner-ads", label: "Banners", icon: ImageIcon },
    ],
  },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  const handleLogout = async () => {
    await signOut({ redirectTo: "/auth/signin" });
  };

  const isLinkActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(href);

  const isGroupActive = (items: NavLink[]) =>
    items.some((item) => pathname.startsWith(item.href));

  return (
    <nav className="glass-heavy border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/hymnz-logo1.png"
              alt="HYMNZ"
              width={24}
              height={24}
              className=""
            />
            <span className="text-display text-sm font-bold text-text-primary">
              Admin
            </span>
          </div>

          {/* Nav entries */}
          <div ref={navRef} className="flex items-center gap-1">
            {navEntries.map((entry) => {
              if (isDropdown(entry)) {
                const active = isGroupActive(entry.items);
                const isOpen = openDropdown === entry.label;

                return (
                  <div key={entry.label} className="relative">
                    <button
                      onClick={() =>
                        setOpenDropdown(isOpen ? null : entry.label)
                      }
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        active
                          ? "bg-accent/15 text-accent"
                          : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                      )}
                    >
                      <entry.icon size={14} />
                      <span className="hidden sm:inline">{entry.label}</span>
                      <ChevronDown
                        size={12}
                        className={cn(
                          "hidden sm:block transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1 min-w-[160px] glass-heavy rounded-xl border border-white/10 py-1 z-50 shadow-lg">
                        {entry.items.map((item) => (
                          <button
                            key={item.href}
                            onClick={() => {
                              router.push(item.href);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "flex items-center gap-2 w-full px-3 py-2 text-xs font-medium transition-colors",
                              isLinkActive(item.href)
                                ? "text-accent bg-accent/10"
                                : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                            )}
                          >
                            <item.icon size={13} />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Standalone link
              return (
                <button
                  key={entry.href}
                  onClick={() => router.push(entry.href)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    isLinkActive(entry.href)
                      ? "bg-accent/15 text-accent"
                      : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                  )}
                >
                  <entry.icon size={14} />
                  <span className="hidden sm:inline">{entry.label}</span>
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
