"use client";

import { CollectionCard } from "./CollectionCard";
import { type ApiCollection } from "@/lib/types";

interface CollectionGridProps {
  collections: ApiCollection[];
}

export function CollectionGrid({ collections }: CollectionGridProps) {
  return (
    <div className="px-4 grid grid-cols-2 gap-4">
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
