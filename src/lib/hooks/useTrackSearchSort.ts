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

  const sortedTracks = useMemo(() => {
    const result = [...tracks];

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
  }, [tracks, sortBy, collectionMap]);

  const filteredTracks = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return sortedTracks;
    return sortedTracks.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        (collectionMap?.get(track.collectionId) ?? "").toLowerCase().includes(q)
    );
  }, [sortedTracks, searchTerm, collectionMap]);

  return {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortedTracks,
    filteredTracks,
  };
}
