"use client";

import { useState } from "react";
import Link from "next/link";
import { Share } from "lucide-react";
import { TrackActions } from "@/components/player/TrackActions";
import { useShare } from "@/lib/hooks/useShare";

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
  const { share } = useShare();
  const [artworkFailed, setArtworkFailed] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        {/* Artwork */}
        {artworkUrl && !artworkFailed ? (
          <img
            src={artworkUrl}
            alt={title}
            onError={() => setArtworkFailed(true)}
            className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover mx-auto mb-6 shadow-2xl"
          />
        ) : (
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-accent/10 border border-accent/20 mx-auto mb-6 flex items-center justify-center text-accent text-3xl text-display">HYMNZ</div>
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
        <div className="mt-6"><TrackActions key={trackId} trackId={trackId} /></div>
        <button onClick={() => share({ type: "track", id: trackId, title, artist, artworkUrl })}
          className="inline-flex items-center gap-2 px-4 py-3 mt-3 text-sm text-accent rounded-xl hover:bg-white/5"><Share size={16} />Share this song</button>
        {collectionId && <Link href={`/collection/${encodeURIComponent(collectionId)}`} className="block mt-2 text-sm text-text-muted hover:text-text-primary">View collection</Link>}
      </div>
    </div>
  );
}
