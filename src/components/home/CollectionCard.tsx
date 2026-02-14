"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Disc3 } from "lucide-react";
import { type ApiCollection } from "@/lib/types";

interface CollectionCardProps {
  collection: ApiCollection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/collection/${collection.id}`)}
      className="group block text-left w-full"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
        {collection.artworkUrl ? (
          <Image
            src={collection.artworkUrl}
            alt={collection.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <Disc3 size={40} className="text-text-dim" />
          </div>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-text-primary text-center">
        {collection.title}
      </p>
    </button>
  );
}
