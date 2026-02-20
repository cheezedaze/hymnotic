"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { type ApiCollection, type ApiTrack } from "@/lib/types";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { CollectionHeader } from "./CollectionHeader";
import { ActionRow } from "./ActionRow";
import { TrackList } from "./TrackList";

interface FavoritesCollectionProps {
  collection: ApiCollection | null;
}

export function FavoritesCollection({ collection }: FavoritesCollectionProps) {
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (favoriteIds.length === 0) {
      setTracks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/tracks/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: favoriteIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTracks(Array.isArray(data) ? data : []);
      })
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, [favoriteIds]);

  // Build a fallback collection object if none exists in the DB yet
  const displayCollection: ApiCollection = collection ?? {
    id: "favorites",
    title: "Favorites",
    subtitle: "Your loved tracks",
    description: null,
    artworkKey: null,
    artworkUrl: null,
    featured: false,
    sortOrder: -1,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="min-h-dvh">
      <CollectionHeader
        collection={displayCollection}
        trackCount={tracks.length}
      />
      {tracks.length > 0 ? (
        <>
          <ActionRow tracks={tracks} />
          <TrackList tracks={tracks} />
        </>
      ) : (
        <div className="px-6 py-16 text-center">
          {loading ? (
            <p className="text-text-muted text-sm">Loading favorites...</p>
          ) : (
            <>
              <Heart size={32} className="text-text-dim mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                No Favorites Yet
              </h3>
              <p className="text-text-muted text-xs max-w-xs mx-auto">
                Tap the heart on any track to save it here.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
