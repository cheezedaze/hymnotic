"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

interface TrackLandingProps {
  trackId: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  collectionId: string | null;
  collectionTitle: string | null;
}

export function TrackLanding({
  trackId,
  title,
  artist,
  artworkUrl,
  collectionId,
  collectionTitle,
}: TrackLandingProps) {
  const router = useRouter();

  // Auto-redirect to collection with autoplay after a brief moment
  useEffect(() => {
    if (collectionId) {
      const timeout = setTimeout(() => {
        router.replace(`/collection/${collectionId}?play=${trackId}`);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [collectionId, trackId, router]);

  const handleListen = () => {
    if (collectionId) {
      router.push(`/collection/${collectionId}?play=${trackId}`);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        {/* Artwork */}
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={title}
            className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover mx-auto mb-6 shadow-2xl"
          />
        ) : (
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-accent/10 border border-accent/20 mx-auto mb-6" />
        )}

        {/* Track info */}
        <h1 className="text-display text-xl font-bold text-text-primary mb-1">
          {title}
        </h1>
        <p className="text-text-secondary text-sm mb-1">{artist}</p>
        {collectionTitle && (
          <p className="text-text-muted text-xs mb-6">{collectionTitle}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleListen}
          className="inline-flex items-center gap-2 py-3 px-8 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors glow-accent"
        >
          <Play size={18} fill="white" />
          Listen on HYMNZ
        </button>
      </div>
    </div>
  );
}
