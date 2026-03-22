"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, ChevronDown, Shuffle, Play, Pause, Share } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { type ApiTrack } from "@/lib/types";
import { TrackList } from "./TrackList";
import { type SortOption } from "./SearchSortBar";
import { useTrackSearchSort } from "@/lib/hooks/useTrackSearchSort";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useSubscriptionStore, recomputeTrackAccess } from "@/lib/store/subscriptionStore";
import { useShare } from "@/lib/hooks/useShare";
import { IconButton } from "@/components/ui/IconButton";
import { GlowButton } from "@/components/ui/GlowButton";

const ALL_SORT_LABELS: Record<SortOption, string> = {
  latest: "Latest",
  oldest: "Oldest",
  title: "Track Name",
  collection: "Collection",
  trackNumber: "Track #",
};

interface CollectionContentProps {
  tracks: ApiTrack[];
  /** Show "Collection" sort option (for multi-collection views like All Tracks) */
  isMultiCollection?: boolean;
  collectionMap?: Map<string, string>;
  collectionId?: string;
  collectionTitle?: string;
  collectionArtworkUrl?: string | null;
  autoPlayTrackId?: string;
}

export function CollectionContent({
  tracks,
  isMultiCollection = false,
  collectionMap,
  collectionId,
  collectionTitle,
  collectionArtworkUrl,
  autoPlayTrackId,
}: CollectionContentProps) {
  const effectiveTier = useSubscriptionStore((s) => s.effectiveTier());
  const sacred7TrackIds = useSubscriptionStore((s) => s.sacred7TrackIds);

  // Recompute track access for admin view-as (server returns admin-level access)
  const accessTracks = useMemo(
    () => recomputeTrackAccess(tracks, effectiveTier, sacred7TrackIds),
    [tracks, effectiveTier, sacred7TrackIds]
  );

  const sortOptions: SortOption[] = isMultiCollection
    ? ["latest", "oldest", "title", "collection"]
    : ["latest", "oldest", "title", "trackNumber"];

  const { searchTerm, setSearchTerm, sortBy, setSortBy, filteredTracks } =
    useTrackSearchSort({ tracks: accessTracks, defaultSort: "latest", collectionMap });

  // Search UI state
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Playback state
  const setQueue = usePlayerStore((s) => s.setQueue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);

  const { share } = useShare();

  const isPlayingFromThis =
    currentTrack && filteredTracks.some((t) => t.id === currentTrack.id);

  // Autoplay from share link (?play=trackId)
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (autoPlayTrackId && !autoPlayedRef.current && accessTracks.length > 0) {
      autoPlayedRef.current = true;
      const index = accessTracks.findIndex((t) => t.id === autoPlayTrackId);
      if (index !== -1) {
        setQueue(accessTracks, index);
      }
    }
  }, [autoPlayTrackId, accessTracks, setQueue]);

  const handleShare = useCallback(() => {
    if (collectionId && collectionTitle) {
      share({ type: "collection", id: collectionId, title: collectionTitle, artworkUrl: collectionArtworkUrl });
    }
  }, [collectionId, collectionTitle, share]);

  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

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

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setSearchTerm("");
      return !prev;
    });
  }, [setSearchTerm]);

  const handlePlayAll = useCallback(() => {
    if (filteredTracks.length === 0) return;
    if (isPlayingFromThis) {
      togglePlayPause();
    } else {
      setQueue(filteredTracks, 0);
    }
  }, [filteredTracks, isPlayingFromThis, togglePlayPause, setQueue]);

  const handleShuffle = useCallback(() => {
    toggleShuffle();
    if (!isPlayingFromThis && filteredTracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredTracks.length);
      setQueue(filteredTracks, randomIndex);
    }
  }, [filteredTracks, isPlayingFromThis, toggleShuffle, setQueue]);

  return (
    <>
      {/* Action row: Sort + Search | Shuffle + Play */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <IconButton label="Share" size="sm" onClick={handleShare}>
            <Share size={18} />
          </IconButton>
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-text-secondary hover:bg-white/10 transition-colors"
            >
              {ALL_SORT_LABELS[sortBy]}
              <ChevronDown
                size={12}
                className={cn(
                  "transition-transform",
                  sortOpen && "rotate-180"
                )}
              />
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
                {sortOptions.map((key) => (
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
                    {ALL_SORT_LABELS[key]}
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

        <div className="flex items-center gap-3">
          <IconButton
            label="Shuffle"
            active={shuffle}
            onClick={handleShuffle}
          >
            <Shuffle size={20} />
          </IconButton>
          <GlowButton size="lg" onClick={handlePlayAll}>
            {isPlayingFromThis && isPlaying ? (
              <Pause size={24} fill="white" className="text-white" />
            ) : (
              <Play size={24} fill="white" className="text-white ml-0.5" />
            )}
          </GlowButton>
        </div>
      </div>

      {/* Collapsible search input */}
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out px-5"
        style={{
          maxHeight: searchOpen ? "4rem" : "0",
          opacity: searchOpen ? 1 : 0,
        }}
      >
        <div className="pb-2">
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

      <TrackList tracks={filteredTracks} />
    </>
  );
}
