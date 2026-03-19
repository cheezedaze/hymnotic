"use client";

import { useMemo } from "react";
import { CollectionCard } from "./CollectionCard";
import { type ApiCollection } from "@/lib/types";
import { useSubscriptionStore } from "@/lib/store/subscriptionStore";

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
  const effectiveTier = useSubscriptionStore((s) => s.effectiveTier());

  const allCollections = useMemo(() => {
    // Sacred 7 is only visible to free subscribers
    const sacred7 = effectiveTier === "free" ? collections.find((c) => c.isSacred7) : undefined;
    const rest = collections.filter((c) => !c.isSacred7);

    // Explicit order: Favorites → Sacred 7 (free only) → All Tracks → rest by sortOrder
    const result: ApiCollection[] = [FAVORITES_PLACEHOLDER];
    if (sacred7) result.push(sacred7);
    result.push(ALL_TRACKS_PLACEHOLDER);
    result.push(...rest);

    return result;
  }, [collections, effectiveTier]);

  return (
    <div className="px-4 grid grid-cols-2 gap-4">
      {allCollections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
