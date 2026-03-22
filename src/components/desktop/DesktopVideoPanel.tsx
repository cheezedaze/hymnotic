"use client";

import Image from "next/image";
import Link from "next/link";
import { Music, Heart, BookOpen, Check, Sparkles } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";

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

const FREE_FEATURES = [
  "7 full-length hymns",
  "1-minute previews of all tracks",
  "Beautiful artwork & visuals",
  "Save favorites",
];

const PREMIUM_FEATURES = [
  "All hymns, fully unlocked",
  "Exclusive new releases",
  "High-quality audio",
  "Full lyrics & visuals",
];

function PromoPanel() {
  const tier = useSubscriptionStore((s) => s.effectiveTier());

  // Don't show promo for paid users
  if (tier === "paid") return null;

  const isFree = tier === "free";
  const features = isFree ? PREMIUM_FEATURES : FREE_FEATURES;
  const heading = isFree ? "HYMNZ Premium Includes" : "Free Account Includes";
  const buttonText = isFree ? "Upgrade to Premium" : "See Options";

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/6 p-5 space-y-4">
      <h3 className="text-display text-base font-semibold text-text-primary">
        {heading}
      </h3>
      <ul className="space-y-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5">
            <Check size={14} className="text-accent shrink-0" />
            <span className="text-text-secondary text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="border-t border-white/6 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-gold" />
          <span className="text-xs font-semibold text-gold uppercase tracking-wide">
            Special Introductory Offer
          </span>
        </div>
        <p className="text-text-primary text-sm mb-1">
          <span className="text-gold font-bold text-lg">$1.99</span>
          <span className="text-text-muted"> for the first month</span>
        </p>
        <p className="text-text-dim text-xs mb-3">
          then <span className="text-text-secondary">$4.99/mo</span> — full
          access to every hymn
        </p>
        <Link
          href="/subscribe"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gold/15 hover:bg-gold/25 border border-gold/25 text-gold font-semibold text-sm rounded-xl transition-colors"
        >
          {buttonText}
        </Link>
      </div>
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="relative flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/hymnz-pipes3.png"
          alt=""
          fill
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/80 to-midnight/40" />
      </div>

      <div className="relative flex-1 flex flex-col justify-end p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Image
            src="/images/hymnz-logo1.png"
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 shrink-0 object-contain"
            aria-hidden
          />
          <h2 className="text-display text-xl font-bold text-text-primary">
            About HYMNZ
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Heart size={14} className="text-accent mt-0.5 shrink-0" />
            <p className="text-text-secondary text-sm leading-relaxed">
              HYMNZ brings timeless hymns into a modern listening experience
              with immersive audio and beautiful visuals.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <BookOpen size={14} className="text-gold mt-0.5 shrink-0" />
            <p className="text-text-secondary text-sm leading-relaxed">
              Every track is crafted to help you connect, reflect, and find
              peace through sacred music.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NowPlayingPanel({ currentTrack }: { currentTrack: NonNullable<ReturnType<typeof usePlayerStore.getState>["currentTrack"]> }) {
  // Uploaded video
  if (currentTrack.hasVideo && currentTrack.videoUrl) {
    return (
      <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-black">
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

  // YouTube video
  if (currentTrack.hasVideo && currentTrack.youtubeUrl) {
    const embedUrl = getYouTubeEmbedUrl(currentTrack.youtubeUrl);
    if (embedUrl) {
      return (
        <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-black">
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

  // Artwork
  const displayArtwork = currentTrack.artworkUrl || currentTrack.collectionArtworkUrl;

  return (
    <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden">
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
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <p className="text-display text-lg font-bold text-text-primary">
          {currentTrack.title}
        </p>
        <p className="text-sm text-text-secondary mt-1">{currentTrack.artist}</p>
      </div>
    </div>
  );
}

export function DesktopVideoPanel() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top row: always shows promo */}
      <PromoPanel />

      {/* Bottom row: About HYMNZ when idle, now-playing media when a track is active */}
      {currentTrack ? (
        <NowPlayingPanel currentTrack={currentTrack} />
      ) : (
        <AboutPanel />
      )}
    </div>
  );
}
