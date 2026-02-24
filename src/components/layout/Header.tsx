"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  GLITCH_DURATION,
  buildGlitchKeyframes,
} from "@/lib/glitch-config";

export function Header() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = buildGlitchKeyframes();
    style.setAttribute("data-glitch-animation", "");
    document.head.appendChild(style);
    return () => {
      document.querySelector("[data-glitch-animation]")?.remove();
    };
  }, []);

  return (
    <header className="flex items-center justify-center py-4 pt-[calc(1.5rem+var(--safe-top))]">
      <div className="flex w-full flex-col items-center gap-1">
        <div className="relative flex min-w-[366px] items-center justify-center overflow-visible">
          {/* Front layer: logo1 */}
          <Image
            src="/images/hymnz-logo1.png"
            alt="HYMNZ"
            width={141}
            height={121}
            className="relative z-10"
            priority
          />
          {/* Glitch overlay: logo2 (first 50ms of each pulse) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hymnz-logo2.png"
            alt=""
            width={141}
            height={121}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[121px] w-[141px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-0"
            style={{ animation: `glitch-flicker-2 ${GLITCH_DURATION}s steps(1) infinite` }}
            aria-hidden
          />
          {/* Glitch overlay: logo3 (second 50ms of each pulse) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hymnz-logo3.png"
            alt=""
            width={141}
            height={121}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[121px] w-[141px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-0"
            style={{ animation: `glitch-flicker-3 ${GLITCH_DURATION}s steps(1) infinite` }}
            aria-hidden
          />
        </div>
        <div className="relative flex w-full self-stretch items-center justify-center px-4 py-2">
          {/* Divider line - deepest layer, extends full width like SectionDivider */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 gradient-divider rounded-full" aria-hidden />
          {/* Title + glitch wrapper */}
          <div className="relative flex items-center justify-center">
            {/* Glitch SVG - behind title, 2px above and 2px to the right */}
            <Image
              src="/images/glitch.svg"
              alt=""
              width={200}
              height={22}
              className="absolute left-1/2 top-1/2 z-0 translate-x-[calc(-50%-2px)] -translate-y-[calc(50%+2px)] brightness-0 invert opacity-80"
              aria-hidden
            />
            <h1 className="relative z-10 text-display text-2xl tracking-[0.35em] text-text-primary uppercase font-medium">
              HYMNZ
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
