import { create } from "zustand";
import { type ApiTrack } from "@/lib/types";
import { stopVoiceover } from "@/lib/audio/voiceoverContext";

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

  history: ApiTrack[];

  isNowPlayingExpanded: boolean;
  isLyricsOpen: boolean;
  isMiniPlayerVisible: boolean;
  showNavBar: boolean;

  // Preview state
  isPreviewMode: boolean;
  previewDuration: number | null;
  previewCheckpoint: number | null;
  isPreviewEnded: boolean;
  isVoiceoverPlaying: boolean;
  showUpgradeModal: boolean;
  showPreviewActions: boolean;

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
  setPreviewMode: (isPreview: boolean, duration: number | null) => void;
  setPreviewEnded: (ended: boolean) => void;
  setVoiceoverPlaying: (playing: boolean) => void;
  setShowUpgradeModal: (show: boolean) => void;
  setShowPreviewActions: (show: boolean) => void;
  tryNextSong: () => void;
}

/** Compute preview state fields from a track's access metadata */
function previewStateForTrack(track: ApiTrack | null | undefined) {
  const isPreview = track?.isLocked ?? false;
  const previewDur = isPreview ? (track?.previewDuration ?? null) : null;
  return {
    isPreviewMode: isPreview,
    previewDuration: previewDur,
    previewCheckpoint: previewDur,
    isPreviewEnded: false,
    isVoiceoverPlaying: false,
    showUpgradeModal: false,
    showPreviewActions: false,
  };
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

  history: [],

  isNowPlayingExpanded: false,
  isLyricsOpen: false,
  isMiniPlayerVisible: false,
  showNavBar: true,

  isPreviewMode: false,
  previewDuration: null,
  previewCheckpoint: null,
  isPreviewEnded: false,
  isVoiceoverPlaying: false,
  showUpgradeModal: false,
  showPreviewActions: false,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlayPause: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, currentIndex, repeat, shuffle, currentTrack, history } =
      get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (repeat === "one") {
      set({ currentTime: 0 });
      return;
    }

    if (shuffle) {
      if (queue.length === 1) {
        nextIndex = 0;
      } else {
        // Avoid picking the same track consecutively
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
        } while (nextIndex === currentIndex);
      }
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

    const newHistory = currentTrack
      ? [...history, currentTrack].slice(-50)
      : history;

    const nextTrack = queue[nextIndex];
    set({
      currentIndex: nextIndex,
      currentTrack: nextTrack,
      currentTime: 0,
      duration: nextTrack.duration,
      isPlaying: true,
      history: newHistory,
      ...previewStateForTrack(nextTrack),
    });
  },

  previous: () => {
    const { queue, currentIndex, currentTime, history, currentTrack } = get();
    if (queue.length === 0 && !currentTrack) return;

    // More than 3 seconds in — restart current track
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    // History has entries — pop and play the previous track
    if (history.length > 0) {
      const newHistory = [...history];
      const prevTrack = newHistory.pop()!;
      const queueIndex = queue.findIndex((t) => t.id === prevTrack.id);

      set({
        currentTrack: prevTrack,
        currentIndex: queueIndex !== -1 ? queueIndex : currentIndex,
        currentTime: 0,
        duration: prevTrack.duration,
        isPlaying: true,
        history: newHistory,
        ...previewStateForTrack(prevTrack),
      });
      return;
    }

    // No history — fall back to queue-based navigation
    if (queue.length === 0) return;
    const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    const prevTrack = queue[prevIndex];
    set({
      currentIndex: prevIndex,
      currentTrack: prevTrack,
      currentTime: 0,
      duration: prevTrack.duration,
      isPlaying: true,
      ...previewStateForTrack(prevTrack),
    });
  },

  seekTo: (time) => set({ currentTime: time }),

  setQueue: (tracks, startIndex = 0) => {
    const { currentTrack, history } = get();
    const newHistory =
      currentTrack && currentTrack.id !== tracks[startIndex]?.id
        ? [...history, currentTrack].slice(-50)
        : history;

    const startTrack = tracks[startIndex] ?? null;
    set({
      queue: tracks,
      currentIndex: startIndex,
      currentTrack: startTrack,
      currentTime: 0,
      duration: startTrack?.duration ?? 0,
      isPlaying: true,
      isMiniPlayerVisible: true,
      history: newHistory,
      ...previewStateForTrack(startTrack),
    });
  },

  playTrack: (track, queue) => {
    const state = get();

    // If the same track is already loaded, just ensure it's playing — don't restart
    if (state.currentTrack?.id === track.id) {
      if (!state.isPlaying) {
        set({ isPlaying: true });
      }
      return;
    }

    const newHistory = state.currentTrack
      ? [...state.history, state.currentTrack].slice(-50)
      : state.history;

    const q = queue ?? state.queue;
    const index = q.findIndex((t) => t.id === track.id);

    const baseState = {
      currentTrack: track,
      currentTime: 0,
      duration: track.duration,
      isPlaying: true,
      isMiniPlayerVisible: true,
      history: newHistory,
      ...previewStateForTrack(track),
    };

    if (index === -1) {
      set({ queue: [track], currentIndex: 0, ...baseState });
    } else {
      set({ queue: q, currentIndex: index, ...baseState });
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
  setPreviewMode: (isPreview, duration) =>
    set({ isPreviewMode: isPreview, previewDuration: duration }),
  setPreviewEnded: (ended) => set({ isPreviewEnded: ended }),
  setVoiceoverPlaying: (playing) => set({ isVoiceoverPlaying: playing }),
  setShowUpgradeModal: (show) => set({ showUpgradeModal: show }),
  setShowPreviewActions: (show) => set({ showPreviewActions: show }),
  tryNextSong: () => {
    stopVoiceover();
    set({
      showPreviewActions: false,
      showUpgradeModal: false,
      isVoiceoverPlaying: false,
    });
    get().next();
  },
}));
