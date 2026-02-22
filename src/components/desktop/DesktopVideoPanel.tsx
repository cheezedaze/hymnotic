"use client";

import Image from "next/image";
import { Music, Heart, BookOpen } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") && parsed.searchParams.has("v")) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get("v")}?autoplay=0&rel=0`;
    }
    if (parsed.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${parsed.pathname}?autoplay=0&rel=0`;
    }
  } catch {}
  return null;
}

export function DesktopVideoPanel() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  // No track playing: show About Hymnotic
  if (!currentTrack) {
    return (
      <div className="relative h-full flex flex-col rounded-2xl overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hymnotic-pipes3.png"
            alt=""
            fill
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/80 to-midnight/40" />
        </div>

        {/* About content */}
        <div className="relative flex-1 flex flex-col justify-end p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Image
              src="/images/hymnotic-logo1.png"
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 shrink-0 object-contain"
              aria-hidden
            />
            <h2 className="text-display text-xl font-bold text-text-primary">
              About Hymnotic
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Heart size={14} className="text-accent mt-0.5 shrink-0" />
              <p className="text-text-secondary text-sm leading-relaxed">
                Hymnotic brings timeless hymns into a modern listening experience
                with immersive audio and beautiful visuals.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen size={14} className="text-gold mt-0.5 shrink-0" />
              <p className="text-text-secondary text-sm leading-relaxed">
                Every track is crafted to help you connect, reflect, and find peace
                through sacred music.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Track playing with uploaded video file
  if (currentTrack.hasVideo && currentTrack.videoUrl) {
    return (
      <div className="relative h-full rounded-2xl overflow-hidden bg-black">
        <video
          key={currentTrack.videoUrl}
          src={currentTrack.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <p className="text-display text-lg font-bold text-text-primary">
            {currentTrack.title}
          </p>
          <p className="text-sm text-text-secondary mt-1">{currentTrack.artist}</p>
        </div>
      </div>
    );
  }

  // Track playing with YouTube video
  if (currentTrack.hasVideo && currentTrack.youtubeUrl) {
    const embedUrl = getYouTubeEmbedUrl(currentTrack.youtubeUrl);
    if (embedUrl) {
      return (
        <div className="relative h-full rounded-2xl overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            title={currentTrack.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
  }

  // Track playing, no video: show track artwork
  const displayArtwork = currentTrack.artworkUrl || currentTrack.collectionArtworkUrl;

  return (
    <div className="relative h-full rounded-2xl overflow-hidden">
      {displayArtwork ? (
        <>
          <Image
            src={displayArtwork}
            alt={currentTrack.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
        </>
      ) : (
        <div className="w-full h-full bg-surface flex items-center justify-center">
          <Music size={48} className="text-text-dim" />
        </div>
      )}

      {/* Track title overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <p className="text-display text-lg font-bold text-text-primary">
          {currentTrack.title}
        </p>
        <p className="text-sm text-text-secondary mt-1">
          {currentTrack.artist}
        </p>
      </div>
    </div>
  );
}
