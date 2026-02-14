"use client";

import { collections } from "@/lib/data/collections";
import { CollectionCard } from "./CollectionCard";

export function CollectionGrid() {
  return (
    <div className="px-4 grid grid-cols-2 gap-4">
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
