"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: "/auth/signin" })}
      className="flex items-center gap-2 w-full px-4 py-3 bg-red-400/10 border border-red-400/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-400/20 transition-colors"
    >
      <LogOut size={16} />
      Sign Out
    </button>
  );
}
