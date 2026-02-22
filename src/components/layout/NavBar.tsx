"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Home, Music, Library, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Music, label: "Music" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="pt-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200",
                isActive
                  ? "text-accent"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <item.icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.5}
                className={cn(isActive && "drop-shadow-[0_0_6px_rgba(0,255,251,0.4)]")}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        {/* Brand icon */}
        <Link
          href="/about"
          prefetch={false}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200",
            pathname === "/about"
              ? "text-accent"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          <Image
            src="/images/hymnotic-logo1.png"
            alt=""
            width={22}
            height={22}
            className={cn(
              "w-[22px] h-[22px] shrink-0 object-contain",
              pathname === "/about" && "drop-shadow-[0_0_6px_rgba(0,255,251,0.4)]"
            )}
            aria-hidden
          />
          <span className="text-[10px] font-medium">More</span>
        </Link>
      </div>
    </nav>
  );
}
