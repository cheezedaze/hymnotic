"use client";

import { useState, useEffect } from "react";
import { type ApiTrack, type ApiCollection } from "@/lib/types";
import { CollectionFilterStrip } from "./CollectionFilterStrip";
import { DesktopTrackList } from "./DesktopTrackList";
import { DesktopVideoPanel } from "./DesktopVideoPanel";

interface DesktopHomePageProps {
  collections: ApiCollection[];
}

export function DesktopHomePage({ collections }: DesktopHomePageProps) {
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tracks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTracks(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* Top section: two-panel layout */}
      <div className="flex-1 min-h-0 grid grid-cols-5 gap-6">
        {/* Left panel: Video / About */}
        <div className="col-span-2 min-h-0">
          <DesktopVideoPanel />
        </div>

        {/* Right panel: Collections + Tracks */}
        <div className="col-span-3 flex flex-col min-h-0 gap-4">
          {/* Collection filter strip */}
          <CollectionFilterStrip
            collections={collections}
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
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
