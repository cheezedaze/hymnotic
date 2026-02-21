"use client";

import Image from "next/image";
import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { type ApiCollection } from "@/lib/types";

interface CollectionFilterStripProps {
  collections: ApiCollection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CollectionFilterStrip({
  collections,
  selectedId,
  onSelect,
}: CollectionFilterStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {/* All Tracks pill */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
          selectedId === null
            ? "bg-accent/15 text-accent border border-accent/25"
            : "bg-white/5 text-text-muted border border-white/8 hover:bg-white/8 hover:text-text-secondary"
        )}
      >
        All Tracks
      </button>

      {collections.map((collection) => (
        <button
          key={collection.id}
          onClick={() => onSelect(collection.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
            selectedId === collection.id
              ? "bg-accent/15 text-accent border border-accent/25"
              : "bg-white/5 text-text-muted border border-white/8 hover:bg-white/8 hover:text-text-secondary"
          )}
        >
          {collection.artworkUrl ? (
            <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0">
              <Image
                src={collection.artworkUrl}
                alt=""
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <Disc3 size={14} className="opacity-60 shrink-0" />
          )}
          {collection.title}
        </button>
      ))}
    </div>
  );
}
