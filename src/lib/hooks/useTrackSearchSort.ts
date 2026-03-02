import { useState, useMemo } from "react";
import { type ApiTrack } from "@/lib/types";
import { type SortOption } from "@/components/collection/SearchSortBar";

interface UseTrackSearchSortOptions {
  tracks: ApiTrack[];
  defaultSort?: SortOption;
  collectionMap?: Map<string, string>;
}

export function useTrackSearchSort({
  tracks,
  defaultSort = "latest",
  collectionMap,
}: UseTrackSearchSortOptions) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>(defaultSort);

  const filteredTracks = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    let result = [...tracks];

    if (q) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (collectionMap?.get(t.collectionId) ?? "").toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "collection":
        result.sort((a, b) => {
          const ca = collectionMap?.get(a.collectionId) ?? "";
          const cb = collectionMap?.get(b.collectionId) ?? "";
          return ca.localeCompare(cb) || a.trackNumber - b.trackNumber;
        });
        break;
      case "latest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "trackNumber":
        result.sort((a, b) => a.trackNumber - b.trackNumber);
        break;
    }

    return result;
  }, [tracks, searchTerm, sortBy, collectionMap]);

  return {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filteredTracks,
  };
}
