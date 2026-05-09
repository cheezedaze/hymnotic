"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Music, Heart, BookOpen, BookOpenText, Check, Sparkles, X } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";
import { type ApiLyricLine } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useActiveAds, getAdForTrack } from "@/lib/hooks/useActiveAds";
import { useRotatingBannerAd } from "@/lib/hooks/useActiveBannerAds";

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
          <span className="text-gold font-bold text-lg">$0.99</span>
          <span className="text-text-muted"> for the first month</span>
        </p>
        <p className="text-text-dim text-xs mb-3">
          then <span className="text-text-secondary">$3.99/mo</span> — full
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

function DesktopLyricsView({ trackId, onClose }: { trackId: string; onClose: () => void }) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const [lyrics, setLyrics] = useState<ApiLyricLine[]>([]);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tracks/${trackId}/lyrics`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setLyrics(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLyrics([]);
      });
    return () => { cancelled = true; };
  }, [trackId]);

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentTime]);

  const getActiveLineIndex = () => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].startTime) return i;
    }
    return -1;
  };

  const activeIndex = getActiveLineIndex();

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-teal-solid rounded-2xl">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
        <span className="text-sm font-semibold text-text-secondary">Lyrics</span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
        {lyrics.length > 0 ? (
          <div className="space-y-3">
            {lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;
              return (
                <div
                  key={line.id || index}
                  ref={isActive ? activeLineRef : undefined}
                  className={cn(
                    "text-base leading-relaxed transition-all duration-300 text-display",
                    isActive
                      ? "text-text-primary font-semibold scale-[1.02] origin-left"
                      : isPast
                        ? "text-text-muted"
                        : "text-text-dim",
                    line.isChorus && "italic text-gold/80"
                  )}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-muted text-sm text-center">No lyrics available for this track.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ShowLyricsButton({ isOpen, onClick, hasLyrics }: { isOpen: boolean; onClick: () => void; hasLyrics: boolean }) {
  if (!hasLyrics) return null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
        isOpen
          ? "bg-accent/20 text-accent border border-accent/30"
          : "glass text-text-secondary hover:text-text-primary hover:bg-white/10"
      )}
    >
      <BookOpenText size={14} />
      {isOpen ? "Hide Lyrics" : "Show Lyrics"}
    </button>
  );
}

function NowPlayingPanel({ currentTrack }: { currentTrack: NonNullable<ReturnType<typeof usePlayerStore.getState>["currentTrack"]> }) {
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const toggleLyrics = usePlayerStore((s) => s.toggleLyrics);
  const tier = useSubscriptionStore((s) => s.effectiveTier());
  const sacred7Ids = useSubscriptionStore((s) => s.sacred7TrackIds);
  const { ads: activeAds } = useActiveAds();

  const setLyricsOpen = usePlayerStore((s) => s.setLyricsOpen);

  useEffect(() => {
    if (!currentTrack.hasLyrics && isLyricsOpen) {
      setLyricsOpen(false);
    }
  }, [currentTrack.hasLyrics, isLyricsOpen, setLyricsOpen]);

  const isSacred7Track = sacred7Ids.includes(currentTrack.id);
  const shouldShowAds = tier === "free" && isSacred7Track && activeAds.length > 0;
  const currentAd = shouldShowAds ? getAdForTrack(activeAds, currentTrack.id) : null;

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
          <ShowLyricsButton isOpen={isLyricsOpen} onClick={toggleLyrics} hasLyrics={currentTrack.hasLyrics} />
        </div>
        {isLyricsOpen && (
          <DesktopLyricsView trackId={currentTrack.id} onClose={toggleLyrics} />
        )}
      </div>
    );
  }

  // YouTube video
  if (currentTrack.hasVideo && currentTrack.youtubeUrl) {
    const embedUrl = getYouTubeEmbedUrl(currentTrack.youtubeUrl);
    if (embedUrl) {
      return (
        <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-black">
          {isLyricsOpen ? (
            <DesktopLyricsView trackId={currentTrack.id} onClose={toggleLyrics} />
          ) : (
            <iframe
              src={embedUrl}
              title={currentTrack.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {!isLyricsOpen && (
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <ShowLyricsButton isOpen={isLyricsOpen} onClick={toggleLyrics} hasLyrics={currentTrack.hasLyrics} />
            </div>
          )}
        </div>
      );
    }
  }

  // Artwork (or ad background)
  const displayArtwork = currentTrack.artworkUrl || currentTrack.collectionArtworkUrl;

  return (
    <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden">
      {currentAd ? (
        <>
          <Image
            src={currentAd.imageUrl}
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
          {currentAd.linkUrl && (
            <a
              href={currentAd.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 z-20 text-[9px] text-white/40 uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-full"
            >
              Sponsored
            </a>
          )}
        </>
      ) : displayArtwork ? (
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
        <ShowLyricsButton isOpen={isLyricsOpen} onClick={toggleLyrics} hasLyrics={currentTrack.hasLyrics} />
      </div>
      {isLyricsOpen && (
        <DesktopLyricsView trackId={currentTrack.id} onClose={toggleLyrics} />
      )}
    </div>
  );
}

function DesktopBannerAd() {
  const tier = useSubscriptionStore((s) => s.effectiveTier());
  const { currentBannerAd } = useRotatingBannerAd(30000);

  if (tier !== "free" || !currentBannerAd) return null;

  const Wrapper = currentBannerAd.linkUrl ? "a" : "div";
  const linkProps = currentBannerAd.linkUrl
    ? {
        href: currentBannerAd.linkUrl,
        target: "_blank" as const,
        rel: "noopener noreferrer",
      }
    : {};

  return (
    <Wrapper {...linkProps} className="block rounded-2xl overflow-hidden shrink-0">
      <img
        src={currentBannerAd.imageUrl}
        alt={currentBannerAd.title}
        className="w-full h-auto object-cover"
      />
    </Wrapper>
  );
}

export function DesktopVideoPanel() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top row: always shows promo */}
      <PromoPanel />

      {/* Banner ad for free users */}
      <DesktopBannerAd />

      {/* Bottom row: About HYMNZ when idle, now-playing media when a track is active */}
      {currentTrack ? (
        <NowPlayingPanel currentTrack={currentTrack} />
      ) : (
        <AboutPanel />
      )}
    </div>
  );
}
