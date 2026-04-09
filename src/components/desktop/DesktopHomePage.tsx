"use client";

import { useState, useEffect, useMemo } from "react";
import { Play, Pause, Shuffle } from "lucide-react";
import { type ApiTrack, type ApiCollection } from "@/lib/types";
import { useSubscriptionStore, recomputeTrackAccess, type UserTier } from "@/lib/store/subscriptionStore";
import { usePlayerStore } from "@/lib/store/playerStore";
import { CollectionFilterStrip } from "./CollectionFilterStrip";
import { DesktopTrackList } from "./DesktopTrackList";
import { DesktopVideoPanel } from "./DesktopVideoPanel";
import { DesktopHeroSection } from "./DesktopHeroSection";
import { GlowButton } from "@/components/ui/GlowButton";

interface DesktopHomePageProps {
  collections: ApiCollection[];
  serverTier?: UserTier;
  featuredTrack?: ApiTrack | null;
  featuredQueue?: ApiTrack[];
}

export function DesktopHomePage({ collections, serverTier, featuredTrack, featuredQueue }: DesktopHomePageProps) {
  const [rawTracks, setRawTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const storeTier = useSubscriptionStore((s) => s.effectiveTier());
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);
  const sacred7TrackIds = useSubscriptionStore((s) => s.sacred7TrackIds);

  const setQueue = usePlayerStore((s) => s.setQueue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);

  // Use server-provided tier until client store loads, preventing hydration mismatch
  const effectiveTier = isLoaded ? storeTier : (serverTier ?? storeTier);

  useEffect(() => {
    fetch("/api/tracks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRawTracks(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Recompute track access when tier or sacred7 changes (for admin view-as)
  const tracks = useMemo(
    () => recomputeTrackAccess(rawTracks, effectiveTier, sacred7TrackIds),
    [rawTracks, effectiveTier, sacred7TrackIds]
  );

  // Filter collections: Sacred 7 only visible to free tier
  const filteredCollections = useMemo(
    () => collections.filter((c) => !c.isSacred7 || effectiveTier === "free"),
    [collections, effectiveTier]
  );

  // Sacred 7 collection ID for track filtering
  const sacred7CollectionId = useMemo(
    () => collections.find((c) => c.isSacred7)?.id ?? null,
    [collections]
  );

  // Filter tracks based on selected collection (lifted from DesktopTrackList)
  const filteredTracks = useMemo(() => {
    if (!selectedCollectionId) return tracks;
    if (selectedCollectionId === sacred7CollectionId) {
      return tracks.filter((t) => t.isSacred7);
    }
    return tracks.filter((t) => t.collectionId === selectedCollectionId);
  }, [tracks, selectedCollectionId, sacred7CollectionId]);

  // Reset selection if current collection was filtered out
  useEffect(() => {
    if (
      selectedCollectionId &&
      !filteredCollections.some((c) => c.id === selectedCollectionId)
    ) {
      setSelectedCollectionId(null);
    }
  }, [filteredCollections, selectedCollectionId]);

  const isPlayingFromThisSet =
    currentTrack && filteredTracks.some((t) => t.id === currentTrack.id);

  const handlePlayAll = () => {
    if (isPlayingFromThisSet) {
      togglePlayPause();
    } else if (filteredTracks.length > 0) {
      setQueue(filteredTracks, 0);
    }
  };

  const handleShuffle = () => {
    toggleShuffle();
    if (!isPlayingFromThisSet && filteredTracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredTracks.length);
      setQueue(filteredTracks, randomIndex);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* Top section: two-panel layout */}
      <div className="flex-1 min-h-0 grid grid-cols-5 gap-6">
        {/* Left panel: Collections + Tracks */}
        <div className="col-span-3 flex flex-col min-h-0 gap-4">
          {/* Featured hero section */}
          {featuredTrack && (
            <DesktopHeroSection featuredTrack={featuredTrack} queue={featuredQueue ?? []} />
          )}

          {/* Collection filter strip */}
          <CollectionFilterStrip
            collections={filteredCollections}
            selectedId={selectedCollectionId}
            onSelect={setSelectedCollectionId}
          />

          {/* Play All / Shuffle row */}
          <div className="flex items-center gap-3">
            <GlowButton size="lg" onClick={handlePlayAll}>
              {isPlayingFromThisSet && isPlaying ? (
                <Pause size={28} fill="white" className="text-white" />
              ) : (
                <Play size={28} fill="white" className="text-white ml-0.5" />
              )}
            </GlowButton>
            <button
              onClick={handleShuffle}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                shuffle ? "text-accent" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Shuffle size={24} />
            </button>
          </div>

          {/* Track list */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-text-muted text-sm">Loading tracks...</p>
              </div>
            ) : (
              <DesktopTrackList tracks={filteredTracks} />
            )}
          </div>
        </div>

        {/* Right panel: Video / About */}
        <div className="col-span-2 min-h-0">
          <DesktopVideoPanel />
        </div>
      </div>
    </div>
  );
}
