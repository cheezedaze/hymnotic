"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";

export function HomeParallaxWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef({ transform: "", filter: "", opacity: 1 });
  const rafRef = useRef<number>(0);
  const headerElRef = useRef<HTMLDivElement>(null);

  // Measure header height for the spacer
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const progress = Math.min(window.scrollY / 200, 1);
      const el = headerElRef.current;
      if (!el) return;

      const scale = 1 + progress * 0.3;
      const blur = progress * 10;
      const opacity = 1 - progress;

      el.style.transform = `scale(${scale})`;
      el.style.filter = `blur(${blur}px)`;
      el.style.opacity = String(opacity);
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return (
    <>
      {/* Fixed background header — fades/blurs/scales on scroll */}
      <div
        ref={headerElRef}
        className="fixed top-0 left-0 right-0 z-10 will-change-[transform,filter,opacity]"
        style={{ pointerEvents: "none" }}
      >
        <div ref={headerRef}>
          <Header />
        </div>
      </div>

      {/* Spacer to push content below the header initially */}
      <div style={{ height: headerHeight }} aria-hidden />

      {/* Scrollable content — overlaps the fixed header */}
      <div className="relative z-20">{children}</div>
    </>
  );
}
