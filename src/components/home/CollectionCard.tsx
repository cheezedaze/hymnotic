"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type Collection } from "@/lib/data/collections";

interface CollectionCardProps {
  collection: Collection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/collection/${collection.id}`)}
      className="group block text-left w-full"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
        <Image
          src={collection.artwork}
          alt={collection.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <p className="mt-2 text-sm font-medium text-text-primary text-center">
        {collection.title}
      </p>
    </button>
  );
}
