"use client";

import { useState, useEffect, useMemo } from "react";
import { type ApiTrack, type ApiCollection } from "@/lib/types";
import { useSubscriptionStore, recomputeTrackAccess } from "@/lib/store/subscriptionStore";
import { CollectionFilterStrip } from "./CollectionFilterStrip";
import { DesktopTrackList } from "./DesktopTrackList";
import { DesktopVideoPanel } from "./DesktopVideoPanel";

interface DesktopHomePageProps {
  collections: ApiCollection[];
}

export function DesktopHomePage({ collections }: DesktopHomePageProps) {
  const [rawTracks, setRawTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const effectiveTier = useSubscriptionStore((s) => s.effectiveTier());
  const sacred7TrackIds = useSubscriptionStore((s) => s.sacred7TrackIds);

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

  // Reset selection if current collection was filtered out
  useEffect(() => {
    if (
      selectedCollectionId &&
      !filteredCollections.some((c) => c.id === selectedCollectionId)
    ) {
      setSelectedCollectionId(null);
    }
  }, [filteredCollections, selectedCollectionId]);

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* Top section: two-panel layout */}
      <div className="flex-1 min-h-0 grid grid-cols-5 gap-6">
        {/* Left panel: Collections + Tracks */}
        <div className="col-span-3 flex flex-col min-h-0 gap-4">
          {/* Collection filter strip */}
          <CollectionFilterStrip
            collections={filteredCollections}
            selectedId={selectedCollectionId}
            onSelect={setSelectedCollectionId}
          />

          {/* Track list */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-text-muted text-sm">Loading tracks...</p>
              </div>
            ) : (
              <DesktopTrackList
                tracks={tracks}
                selectedCollectionId={selectedCollectionId}
                sacred7CollectionId={sacred7CollectionId}
              />
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
