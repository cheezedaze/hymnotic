"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, X, Disc3, Music, Play, Pause, Shuffle, ChevronDown, Music2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { usePlayerStore } from "@/lib/store/playerStore";
import { IconButton } from "@/components/ui/IconButton";
import { GlowButton } from "@/components/ui/GlowButton";
import { type ApiTrack, type ApiCollection } from "@/lib/types";

type TabId = "tracks" | "collections";
type SortOption = "title" | "collection" | "latest" | "oldest";

const sortLabels: Record<SortOption, string> = {
  title: "Track Name",
  collection: "Collection",
  latest: "Latest",
  oldest: "Oldest",
};

function TracksList({
  tracks,
  allTracks,
  collectionMap,
}: {
  tracks: ApiTrack[];
  allTracks: ApiTrack[];
  collectionMap: Map<string, string>;
}) {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const expandNowPlaying = usePlayerStore((s) => s.expandNowPlaying);

  if (tracks.length === 0) {
    return (
      <div className="glass-heavy rounded-xl p-8 text-center">
        <Music size={32} className="text-text-dim mx-auto mb-3" />
        <p className="text-text-muted text-sm">No tracks found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tracks.map((track) => {
        const displayArtwork = track.artworkUrl || track.collectionArtworkUrl;
        const collectionName = collectionMap.get(track.collectionId) ?? track.artist;
        return (
          <button
            key={track.id}
            onClick={() => {
              playTrack(track, allTracks);
              expandNowPlaying();
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors w-full text-left"
          >
            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
              {displayArtwork ? (
                <Image
                  src={displayArtwork}
                  alt={track.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <Music size={14} className="text-text-dim" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {track.title}
              </p>
              <p className="text-xs text-text-muted truncate">
                {collectionName}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function CollectionsList({
  collections,
}: {
  collections: ApiCollection[];
}) {
  if (collections.length === 0) {
    return (
      <div className="glass-heavy rounded-xl p-8 text-center">
        <Disc3 size={32} className="text-text-dim mx-auto mb-3" />
        <p className="text-text-muted text-sm">No collections found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {collections.map((c) => (
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
  );
}

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState<TabId>("tracks");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title");
  const [sortOpen, setSortOpen] = useState(false);
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const setQueue = usePlayerStore((s) => s.setQueue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);

  useEffect(() => {
    Promise.all([
      fetch("/api/tracks").then((r) => r.json()),
      fetch("/api/collections").then((r) => r.json()),
    ])
      .then(([t, c]) => {
        setTracks(Array.isArray(t) ? t : []);
        setCollections(Array.isArray(c) ? c : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    if (sortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [sortOpen]);

  const collectionMap = useMemo(() => {
    const map = new Map<string, string>();
    collections.forEach((c) => map.set(c.id, c.title));
    return map;
  }, [collections]);

  const filteredTracks = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    let result = [...tracks];

    // Filter
    if (q) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (collectionMap.get(t.collectionId) ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "collection":
        result.sort((a, b) => {
          const ca = collectionMap.get(a.collectionId) ?? "";
          const cb = collectionMap.get(b.collectionId) ?? "";
          return ca.localeCompare(cb) || a.trackNumber - b.trackNumber;
        });
        break;
      case "latest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
    }

    return result;
  }, [tracks, searchTerm, sortBy, collectionMap]);

  const filteredCollections = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const sorted = [...collections].sort((a, b) =>
      a.title.localeCompare(b.title)
    );
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle ?? "").toLowerCase().includes(q)
    );
  }, [collections, searchTerm]);

  const isPlayingFromList =
    currentTrack && filteredTracks.some((t) => t.id === currentTrack.id);

  const handlePlayAll = useCallback(() => {
    if (filteredTracks.length === 0) return;
    if (isPlayingFromList) {
      togglePlayPause();
    } else {
      setQueue(filteredTracks, 0);
    }
  }, [filteredTracks, isPlayingFromList, togglePlayPause, setQueue]);

  const handleShuffle = useCallback(() => {
    toggleShuffle();
    if (!isPlayingFromList && filteredTracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredTracks.length);
      setQueue(filteredTracks, randomIndex);
    }
  }, [filteredTracks, isPlayingFromList, toggleShuffle, setQueue]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setSearchTerm("");
      return !prev;
    });
  }, []);

  return (
    <div className="min-h-dvh">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Sticky: title + tabs + action row */}
        <div
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-[calc(2rem+var(--safe-top))] pb-2"
          style={{
            background: "rgba(20, 26, 36, 0.92)",
            WebkitBackdropFilter: "blur(20px)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Music2 size={18} className="text-accent" />
            <h1 className="text-display text-2xl font-bold text-text-primary">
              Music
            </h1>
          </div>

          {/* Row 1: Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {(["tracks", "collections"] as TabId[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-3 py-2.5 rounded-lg text-xs font-medium capitalize transition-colors",
                  activeTab === tab
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Row 2: Sort + Shuffle/Play (tracks tab only) */}
          {activeTab === "tracks" && (
            <div className="flex items-center justify-between pt-3">
              {/* Sort dropdown + Search toggle */}
              <div className="flex items-center gap-2">
              <div ref={sortRef} className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-text-secondary hover:bg-white/10 transition-colors"
                >
                  {sortLabels[sortBy]}
                  <ChevronDown size={12} className={cn("transition-transform", sortOpen && "rotate-180")} />
                </button>
                {sortOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 w-40 py-1 rounded-xl border border-white/10 shadow-lg z-20"
                    style={{
                      background: "rgba(30, 38, 54, 0.97)",
                      WebkitBackdropFilter: "blur(20px)",
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setSortOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors",
                          sortBy === key
                            ? "text-accent bg-accent/10"
                            : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <IconButton
                label="Search"
                active={searchOpen}
                size="sm"
                onClick={toggleSearch}
              >
                <Search size={16} />
              </IconButton>
              </div>

              {/* Shuffle + Play */}
              <div className="flex items-center gap-3">
                <IconButton
                  label="Shuffle"
                  active={shuffle}
                  onClick={handleShuffle}
                >
                  <Shuffle size={20} />
                </IconButton>
                <GlowButton size="lg" onClick={handlePlayAll}>
                  {isPlayingFromList && isPlaying ? (
                    <Pause size={24} fill="white" className="text-white" />
                  ) : (
                    <Play size={24} fill="white" className="text-white ml-0.5" />
                  )}
                </GlowButton>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible search box */}
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{
            maxHeight: searchOpen ? "4rem" : "0",
            opacity: searchOpen ? 1 : 0,
          }}
        >
          <div className="pt-3 pb-1">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tracks..."
                className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="pb-4 pt-4">
          {loading ? (
            <div className="glass-heavy rounded-xl p-8 text-center">
              <p className="text-text-muted text-sm">Loading...</p>
            </div>
          ) : activeTab === "tracks" ? (
            <TracksList
              tracks={filteredTracks}
              allTracks={filteredTracks}
              collectionMap={collectionMap}
            />
          ) : (
            <CollectionsList collections={filteredCollections} />
          )}
        </div>
      </div>
    </div>
  );
}
