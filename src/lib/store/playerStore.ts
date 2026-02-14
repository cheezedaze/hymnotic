import { create } from "zustand";
import { type ApiTrack } from "@/lib/types";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: ApiTrack[];
  currentIndex: number;
  currentTrack: ApiTrack | null;

  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;

  shuffle: boolean;
  repeat: RepeatMode;

  isNowPlayingExpanded: boolean;
  isLyricsOpen: boolean;
  isMiniPlayerVisible: boolean;
  showNavBar: boolean;

  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (time: number) => void;
  setQueue: (tracks: ApiTrack[], startIndex?: number) => void;
  playTrack: (track: ApiTrack, queue?: ApiTrack[]) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  expandNowPlaying: () => void;
  minimizeNowPlaying: () => void;
  toggleLyrics: () => void;
  setLyricsOpen: (open: boolean) => void;
  toggleNavBar: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  currentTrack: null,

  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,

  shuffle: false,
  repeat: "off",

  isNowPlayingExpanded: false,
  isLyricsOpen: false,
  isMiniPlayerVisible: false,
  showNavBar: true,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlayPause: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, currentIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (repeat === "one") {
      nextIndex = currentIndex;
      set({ currentTime: 0 });
      return;
    }

    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === "all") {
          nextIndex = 0;
        } else {
          set({ isPlaying: false });
          return;
        }
      }
    }

    set({
      currentIndex: nextIndex,
      currentTrack: queue[nextIndex],
      currentTime: 0,
      duration: queue[nextIndex].duration,
    });
  },

  previous: () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;

    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    set({
      currentIndex: prevIndex,
      currentTrack: queue[prevIndex],
      currentTime: 0,
      duration: queue[prevIndex].duration,
    });
  },

  seekTo: (time) => set({ currentTime: time }),

  setQueue: (tracks, startIndex = 0) =>
    set({
      queue: tracks,
      currentIndex: startIndex,
      currentTrack: tracks[startIndex] ?? null,
      currentTime: 0,
      duration: tracks[startIndex]?.duration ?? 0,
      isPlaying: true,
      isMiniPlayerVisible: true,
    }),

  playTrack: (track, queue) => {
    const state = get();
    const q = queue ?? state.queue;
    const index = q.findIndex((t) => t.id === track.id);

    if (index === -1) {
      set({
        queue: [track],
        currentIndex: 0,
        currentTrack: track,
        currentTime: 0,
        duration: track.duration,
        isPlaying: true,
        isMiniPlayerVisible: true,
      });
    } else {
      set({
        queue: q,
        currentIndex: index,
        currentTrack: track,
        currentTime: 0,
        duration: track.duration,
        isPlaying: true,
        isMiniPlayerVisible: true,
      });
    }
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => {
      const modes: RepeatMode[] = ["off", "all", "one"];
      const idx = modes.indexOf(s.repeat);
      return { repeat: modes[(idx + 1) % modes.length] };
    }),

  expandNowPlaying: () =>
    set({ isNowPlayingExpanded: true, showNavBar: false }),
  minimizeNowPlaying: () =>
    set({ isNowPlayingExpanded: false, isLyricsOpen: false, showNavBar: true }),
  toggleLyrics: () => set((s) => ({ isLyricsOpen: !s.isLyricsOpen })),
  setLyricsOpen: (open) => set({ isLyricsOpen: open }),
  toggleNavBar: () => set((s) => ({ showNavBar: !s.showNavBar })),
}));
