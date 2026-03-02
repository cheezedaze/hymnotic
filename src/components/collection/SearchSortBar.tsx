"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { IconButton } from "@/components/ui/IconButton";

export type SortOption = "latest" | "oldest" | "title" | "collection" | "trackNumber";

const ALL_SORT_LABELS: Record<SortOption, string> = {
  latest: "Latest",
  oldest: "Oldest",
  title: "Track Name",
  collection: "Collection",
  trackNumber: "Track #",
};

interface SearchSortBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  sortOptions?: SortOption[];
  searchPlaceholder?: string;
}

export function SearchSortBar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  sortOptions = ["latest", "oldest", "title", "collection"],
  searchPlaceholder = "Search tracks...",
}: SearchSortBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

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
      if (prev) onSearchChange("");
      return !prev;
    });
  }, [onSearchChange]);

  return (
    <>
      {/* Sort + Search toggle row */}
      <div className="flex items-center gap-2">
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-text-secondary hover:bg-white/10 transition-colors"
          >
            {ALL_SORT_LABELS[sortBy]}
            <ChevronDown
              size={12}
              className={cn("transition-transform", sortOpen && "rotate-180")}
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
                    onSortChange(key);
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

      {/* Collapsible search input */}
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out px-5"
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
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
