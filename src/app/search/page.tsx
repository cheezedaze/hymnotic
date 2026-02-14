import { Search, Disc3 } from "lucide-react";
import Image from "next/image";
import { getAllCollections } from "@/lib/db/queries";
import { buildCollectionMediaUrls } from "@/lib/s3/client";
import Link from "next/link";

export default async function SearchPage() {
  const collections = await getAllCollections();
  const collectionsWithUrls = collections.map((c) => ({
    ...c,
    ...buildCollectionMediaUrls(c),
  }));

  return (
    <div className="min-h-dvh px-4 sm:px-6 py-8 pb-32">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Search header */}
        <div className="space-y-4">
          <h1 className="text-display text-2xl font-bold text-text-primary">
            Search
          </h1>

          {/* Search input */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim"
            />
            <input
              type="text"
              placeholder="Search tracks, collections..."
              disabled
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-60"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2">
            {["All", "Tracks", "Collections"].map((filter) => (
              <button
                key={filter}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === "All"
                    ? "bg-accent/15 text-accent border border-accent/25"
                    : "bg-white/5 text-text-muted border border-white/10 hover:bg-white/10"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Browse all */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary">
            Browse Collections
          </h2>

          {collectionsWithUrls.length === 0 ? (
            <div className="glass-heavy rounded-xl p-8 text-center">
              <Disc3 size={32} className="text-text-dim mx-auto mb-3" />
              <p className="text-text-muted text-sm">
                No collections available yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {collectionsWithUrls.map((c) => (
                <Link
                  key={c.id}
                  href={`/collection/${c.id}`}
                  className="glass rounded-xl overflow-hidden group hover:scale-[1.02] transition-transform"
                >
                  <div className="aspect-square relative bg-white/5">
                    {c.artworkUrl ? (
                      <Image
                        src={c.artworkUrl}
                        alt={c.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc3
                          size={32}
                          className="text-text-dim group-hover:text-accent transition-colors"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {c.title}
                    </p>
                    {c.subtitle && (
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {c.subtitle}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
