import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  favoriteIds: string[];
  toggleFavorite: (trackId: string) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      toggleFavorite: (trackId) => {
        const { favoriteIds } = get();
        if (favoriteIds.includes(trackId)) {
          set({ favoriteIds: favoriteIds.filter((id) => id !== trackId) });
        } else {
          set({ favoriteIds: [...favoriteIds, trackId] });
        }
      },
    }),
    { name: "hymnotic-favorites" }
  )
);
