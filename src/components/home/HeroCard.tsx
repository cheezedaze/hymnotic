"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { getTrackById } from "@/lib/data/tracks";
import { getTracksByCollection } from "@/lib/data/tracks";
import { featuredTrackId } from "@/lib/data/collections";

export function HeroCard() {
  // #region agent log
  useEffect(() => {
    fetch("/api/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "HeroCard.tsx:mount",
        message: "HeroCard mounted",
        data: { hasFeaturedTrack: !!getTrackById(featuredTrackId) },
        timestamp: Date.now(),
        hypothesisId: "H4",
      }),
    }).catch(() => {});
  }, []);
  // #endregion
  const playTrack = usePlayerStore((s) => s.playTrack);
  const expandNowPlaying = usePlayerStore((s) => s.expandNowPlaying);
  const featuredTrack = getTrackById(featuredTrackId);

  if (!featuredTrack) return null;

  const handlePlay = () => {
    const queue = getTracksByCollection(featuredTrack.collectionId);
    playTrack(featuredTrack, queue);
    expandNowPlaying();
  };

  return (
    <section className="px-4 mt-4">
      <button onClick={handlePlay} className="relative w-full rounded-2xl group">
        {/* Background image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/image-1.png"
            alt="Featured"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-midnight-deep/90 via-midnight/40 to-transparent" />
        </div>

        {/* Label - overlaps top edge, top of parent in center of span */}
        <div className="absolute top-0 left-0 right-0 flex justify-center -translate-y-1/2">
          <span className="glass px-4 py-1.5 rounded-lg text-xs font-medium text-text-secondary tracking-wide">
            Featured This Month
          </span>
        </div>

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-accent-50 flex items-center justify-center glow-accent group-hover:scale-110 transition-transform">
            <Play size={24} fill="white" className="text-white ml-0.5" />
          </div>
        </div>

        {/* Title - overlaps bottom edge, bottom of parent in center of div */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center translate-y-1/2">
          <div className="glass-heavy px-6 py-3 rounded-xl">
            <h2 className="text-display text-xl font-bold text-text-primary text-center">
              {featuredTrack.title}
            </h2>
          </div>
        </div>
      </button>
    </section>
  );
}
