"use client";

import { useEffect, useState, useMemo } from "react";
import { Music } from "lucide-react";
import { type ApiCollection, type ApiTrack } from "@/lib/types";
import { CollectionHeader } from "./CollectionHeader";
import { CollectionContent } from "./CollectionContent";

const ALL_TRACKS_COLLECTION: ApiCollection = {
  id: "all-tracks",
  title: "All Tracks",
  subtitle: "Every song in one place",
  description: null,
  artworkKey: null,
  artworkUrl: "/images/album-all-tracks.jpg",
  featured: false,
  sortOrder: -0.5,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function AllTracksCollection() {
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tracks").then((r) => r.json()),
      fetch("/api/collections").then((r) => r.json()),
    ])
      .then(([t, c]) => {
        setTracks(Array.isArray(t) ? t : []);
        setCollections(Array.isArray(c) ? c : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const collectionMap = useMemo(() => {
    const map = new Map<string, string>();
    collections.forEach((c) => map.set(c.id, c.title));
    return map;
  }, [collections]);

  return (
    <div className="min-h-dvh">
      <CollectionHeader
        collection={ALL_TRACKS_COLLECTION}
        trackCount={tracks.length}
      />
      {tracks.length > 0 ? (
        <CollectionContent
          tracks={tracks}
          isMultiCollection={true}
          collectionMap={collectionMap}
        />
      ) : (
        <div className="px-6 py-16 text-center">
          {loading ? (
            <p className="text-text-muted text-sm">Loading tracks...</p>
          ) : (
            <>
              <Music size={32} className="text-text-dim mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                No Tracks Yet
              </h3>
              <p className="text-text-muted text-xs max-w-xs mx-auto">
                Tracks will appear here when collections are published.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
