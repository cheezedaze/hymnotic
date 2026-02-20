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

export function CollectionGrid({ collections }: CollectionGridProps) {
  const allCollections = useMemo(() => {
    const hasFavorites = collections.some((c) => c.id === "favorites");
    if (hasFavorites) return collections;
    return [FAVORITES_PLACEHOLDER, ...collections];
  }, [collections]);

  return (
    <div className="px-4 grid grid-cols-2 gap-4">
      {allCollections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
