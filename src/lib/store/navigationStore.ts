import { create } from "zustand";

type NavigationDirection = "forward" | "back";

interface NavigationState {
  direction: NavigationDirection;
  /** When true, the slide-in overlay is visible (covering the screen). */
  isTransitioning: boolean;
  setDirection: (direction: NavigationDirection) => void;
  startTransition: () => void;
  endTransition: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  direction: "forward",
  isTransitioning: false,
  setDirection: (direction) => set({ direction }),
  startTransition: () => set({ isTransitioning: true }),
  endTransition: () => set({ isTransitioning: false }),
}));
