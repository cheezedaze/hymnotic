"use client";

import { BrandHeader } from "@/components/layout/BrandHeader";

export function Header() {
  return (
    <header className="flex items-center justify-center py-4 pt-[calc(1.5rem+var(--safe-top))]">
      <BrandHeader variant="mobile" />
    </header>
  );
}
