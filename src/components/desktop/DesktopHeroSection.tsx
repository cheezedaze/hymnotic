"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { type ApiTrack } from "@/lib/types";

interface DesktopHeroSectionProps {
  featuredTrack: ApiTrack;
  queue: ApiTrack[];
}

export function DesktopHeroSection({ featuredTrack, queue }: DesktopHeroSectionProps) {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const expandNowPlaying = usePlayerStore((s) => s.expandNowPlaying);

  const artworkUrl = featuredTrack.artworkUrl || featuredTrack.collectionArtworkUrl || "/images/image-1.png";

  const handlePlay = () => {
    playTrack(featuredTrack, queue);
    expandNowPlaying();
  };

  return (
    <button
      onClick={handlePlay}
      className="relative w-full flex items-stretch rounded-2xl overflow-hidden border border-white/5 group hover:border-accent/20 transition-colors cursor-pointer"
    >
      {/* Blurred background image */}
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artworkUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-150 blur-sm opacity-25"
          style={{ filter: "blur(8px)" }}
        />
        <div className="absolute inset-0 bg-midnight/40" />
      </div>

      {/* Artwork - left side, square */}
      <div className="relative w-[200px] h-[200px] shrink-0">
        <Image
          src={artworkUrl}
          alt={featuredTrack.title}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content - right side */}
      <div className="relative flex-1 flex items-center justify-between px-8 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-accent tracking-wide uppercase">
            Featured This Month
          </span>
          <h2 className="text-display text-2xl font-bold text-text-primary">
            {featuredTrack.title}
          </h2>
          {featuredTrack.artist && (
            <p className="text-sm text-text-secondary">{featuredTrack.artist}</p>
          )}
        </div>

        {/* Play button */}
        <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center glow-accent group-hover:scale-110 transition-transform shrink-0 ml-4">
          <Play size={20} fill="white" className="text-white ml-0.5" />
        </div>
      </div>
    </button>
  );
}
