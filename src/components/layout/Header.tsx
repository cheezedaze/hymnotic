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
          {/* Back layer: cyan #00FFFB, 13.4px blur, 30% larger than logo, no drop-shadow */}
          <div
            className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 opacity-100"
            style={{ filter: 'blur(13.4px)', WebkitFilter: 'blur(13.4px)' }}
            aria-hidden
          >
            <div
              style={{
                width: 220,
                height: 189,
                backgroundColor: 'rgba(0, 255, 251, 0.18)',
                maskImage: 'url(/images/think-celestial-hymnotic.svg)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                maskType: 'alpha',
                WebkitMaskImage: 'url(/images/think-celestial-hymnotic.svg)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
              }}
            />
          </div>
          {/* Front layer: white with yellow drop-shadow */}
          <Image
            src="/images/think-celestial-hymnotic.svg"
            alt="Hymnotic"
            width={141}
            height={121}
            className="relative z-10 brightness-0 invert drop-shadow-[0_0_7.6px_rgba(255,242,0,0.61)]"
            priority
          />
          {/* Glitch overlay: plain img avoids Next.js responsive constraints; container min-w-[366px] gives it room */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/glitch-logo.png"
            alt=""
            width={292}
            height={250}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[250px] w-[292px] -translate-x-[calc(50%+5px)] -translate-y-1/2 object-contain animate-[glitch-flicker_var(--glitch-duration)_steps(1)_infinite]"
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
              Hymnotic
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
