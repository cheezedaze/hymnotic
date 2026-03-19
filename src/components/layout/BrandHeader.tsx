"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  GLITCH_DURATION,
  buildGlitchKeyframes,
} from "@/lib/glitch-config";

interface BrandHeaderProps {
  variant: "mobile" | "sidebar";
}

export function BrandHeader({ variant }: BrandHeaderProps) {
  useEffect(() => {
    // Only inject once even if multiple instances mount
    if (document.querySelector("[data-glitch-animation]")) return;
    const style = document.createElement("style");
    style.textContent = buildGlitchKeyframes();
    style.setAttribute("data-glitch-animation", "");
    document.head.appendChild(style);
    return () => {
      document.querySelector("[data-glitch-animation]")?.remove();
    };
  }, []);

  const isMobile = variant === "mobile";
  const logoW = isMobile ? 141 : 70;
  const logoH = isMobile ? 121 : 60;

  return (
    <div className={isMobile ? "flex w-full flex-col items-center gap-1" : "flex flex-col items-center gap-1"}>
      {/* Logo stack with glitch overlays */}
      <div
        className={
          isMobile
            ? "relative flex min-w-[366px] items-center justify-center overflow-visible"
            : "relative flex items-center justify-center overflow-visible"
        }
      >
        {/* Front layer: logo1 */}
        <Image
          src="/images/hymnz-logo1.png"
          alt="HYMNZ"
          width={logoW}
          height={logoH}
          className="relative z-10"
          priority
        />
        {/* Glitch overlay: logo2 (first half of each pulse) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hymnz-logo2.png"
          alt=""
          width={logoW}
          height={logoH}
          className={`pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 object-contain opacity-0 ${
            isMobile ? "h-[121px] w-[141px]" : "h-[60px] w-[70px]"
          }`}
          style={{ animation: `glitch-flicker-2 ${GLITCH_DURATION}s steps(1) infinite` }}
          aria-hidden
        />
        {/* Glitch overlay: logo3 (second half of each pulse) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hymnz-logo3.png"
          alt=""
          width={logoW}
          height={logoH}
          className={`pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 object-contain opacity-0 ${
            isMobile ? "h-[121px] w-[141px]" : "h-[60px] w-[70px]"
          }`}
          style={{ animation: `glitch-flicker-3 ${GLITCH_DURATION}s steps(1) infinite` }}
          aria-hidden
        />
      </div>

      {/* Divider + HYMNZ title */}
      <div className={`relative flex w-full self-stretch items-center justify-center ${isMobile ? "px-4 py-2" : "px-2 py-1"}`}>
        {/* Divider line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 gradient-divider rounded-full" aria-hidden />
        {/* Title + glitch wrapper */}
        <div className="relative flex items-center justify-center">
          {/* Glitch SVG overlay */}
          <Image
            src="/images/glitch.svg"
            alt=""
            width={isMobile ? 200 : 120}
            height={isMobile ? 22 : 14}
            className="absolute left-1/2 top-1/2 z-0 translate-x-[calc(-50%-2px)] -translate-y-[calc(50%+2px)] opacity-80"
            aria-hidden
          />
          <h1
            className={`relative z-10 text-display tracking-[0.35em] text-text-primary uppercase font-medium ${
              isMobile ? "text-2xl" : "text-lg"
            }`}
          >
            HYMNZ
          </h1>
        </div>
      </div>
    </div>
  );
}
