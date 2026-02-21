import { create } from "zustand";

interface FavoritesState {
  favoriteIds: string[];
  isLoaded: boolean;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (trackId: string) => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteIds: [],
  isLoaded: false,

  loadFavorites: async () => {
    try {
      const res = await fetch("/api/user/favorites");
      if (res.ok) {
        const data = await res.json();
        set({ favoriteIds: data.trackIds, isLoaded: true });
      }
    } catch {
      // Silently fail; favorites will be empty
      set({ isLoaded: true });
    }
  },

  toggleFavorite: (trackId) => {
    const { favoriteIds } = get();
    const isFavorited = favoriteIds.includes(trackId);

    // Optimistic update
    if (isFavorited) {
      set({ favoriteIds: favoriteIds.filter((id) => id !== trackId) });
    } else {
      set({ favoriteIds: [...favoriteIds, trackId] });
    }

    // Sync with server
    fetch("/api/user/favorites", {
      method: isFavorited ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    }).catch(() => {
      // Revert optimistic update on failure
      set({ favoriteIds });
    });
  },
}));
