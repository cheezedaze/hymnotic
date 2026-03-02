"use client";

import { useMemo } from "react";
import { CollectionCard } from "./CollectionCard";
import { type ApiCollection } from "@/lib/types";

interface CollectionGridProps {
  collections: ApiCollection[];
}

const FAVORITES_PLACEHOLDER: ApiCollection = {
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

const ALL_TRACKS_PLACEHOLDER: ApiCollection = {
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

export function CollectionGrid({ collections }: CollectionGridProps) {
  const allCollections = useMemo(() => {
    const hasFavorites = collections.some((c) => c.id === "favorites");
    const hasAllTracks = collections.some((c) => c.id === "all-tracks");

    let result = [...collections];

    if (!hasAllTracks) {
      result = [ALL_TRACKS_PLACEHOLDER, ...result];
    }
    if (!hasFavorites) {
      result = [FAVORITES_PLACEHOLDER, ...result];
    }

    return result;
  }, [collections]);

  return (
    <div className="px-4 grid grid-cols-2 gap-4">
      {allCollections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
