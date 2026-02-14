"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { type Collection } from "@/lib/data/collections";
import { cn } from "@/lib/utils/cn";

interface CollectionHeaderProps {
  collection: Collection;
}

export function CollectionHeader({ collection }: CollectionHeaderProps) {
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const maxScroll = 250;
  const progress = Math.min(scrollY / maxScroll, 1);
  const smoothProgress = progress * progress * (3 - 2 * progress);
  const parallaxOffset = scrollY * 0.5;
  const artworkScale = 1 + progress * 0.2;
  const artworkBlur = smoothProgress * 10;
  const stickyOpacity = progress > 0.6 ? (progress - 0.6) / 0.4 : 0;
  const gradientOpacity = 1 - progress;
  const gradientBlur = progress * 12;

  return (
    <>
      {/* Sticky title bar */}
      <div
        className="fixed top-0 left-0 right-0 z-30 glass-heavy px-4 py-3 pt-[calc(0.75rem+var(--safe-top))] flex items-center gap-3 transition-opacity duration-200"
        style={{ opacity: stickyOpacity, pointerEvents: stickyOpacity > 0 ? "auto" : "none" }}
      >
        <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-display text-base font-semibold text-text-primary truncate">
          {collection.title}
        </h1>
      </div>

      {/* Hero artwork */}
      <div ref={headerRef} className="relative w-full">
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          {/* Image parallax: stays in place, scales and blurs on scroll */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translateY(${parallaxOffset}px) scale(${artworkScale})`,
              transformOrigin: "top center",
              filter: `blur(${artworkBlur}px)`,
              WebkitFilter: `blur(${artworkBlur}px)`,
            }}
          >
            <Image
              src={collection.artwork}
              alt={collection.title}
              fill
              className="object-cover"
              priority
            />
          </div>
          {/* Gradient stays full size, fades and blurs on scroll */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/40 to-transparent pointer-events-none"
            style={{
              opacity: gradientOpacity,
              filter: `blur(${gradientBlur}px)`,
              WebkitFilter: `blur(${gradientBlur}px)`,
            }}
          />
        </div>

        {/* Back button (visible when not scrolled) */}
        <button
          onClick={() => router.back()}
          className={cn(
            "absolute top-4 left-4 z-20 w-10 h-10 rounded-full glass flex items-center justify-center transition-opacity",
            stickyOpacity > 0 ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
          style={{ top: "calc(1rem + var(--safe-top))" }}
        >
          <ArrowLeft size={20} className="text-text-primary" />
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <h1 className="text-display text-2xl font-bold text-text-primary">
            {collection.title}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {collection.trackCount} songs
          </p>
        </div>
      </div>
    </>
  );
}
