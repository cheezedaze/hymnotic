import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type ApiTrack } from "@/lib/types";
import { stopVoiceover } from "@/lib/audio/voiceoverContext";

export type RepeatMode = "off" | "all" | "one";

export interface ShuffleQueueEntry {
  order: string[];
  position: number;
  sourceHash: string;
  generatedAt: number;
}

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

  // Per-collection persisted shuffle queues. Key = collectionId.
  shuffleQueues: Record<string, ShuffleQueueEntry>;
  // Which collection's persisted shuffle queue drives next()/previous().
  activeShuffleCollectionId: string | null;

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
  startShuffledCollection: (collectionId: string, tracks: ApiTrack[]) => void;
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

function computeSourceHash(tracks: ApiTrack[]): string {
  return tracks
    .map((t) => t.id)
    .slice()
    .sort()
    .join("|");
}

function fisherYates(ids: string[]): string[] {
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Reorder tracks to match a shuffled order of IDs. Tracks not in `order` are dropped. */
function tracksFromOrder(order: string[], tracks: ApiTrack[]): ApiTrack[] {
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const out: ApiTrack[] = [];
  for (const id of order) {
    const t = byId.get(id);
    if (t) out.push(t);
  }
  return out;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
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

      shuffleQueues: {},
      activeShuffleCollectionId: null,

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

      play: () =>
        set((s) => ({
          isPlaying: true,
          ...(s.isPreviewEnded ? { isPreviewEnded: false } : {}),
        })),
      pause: () => set({ isPlaying: false }),
      togglePlayPause: () =>
        set((s) => ({
          isPlaying: !s.isPlaying,
          ...(!s.isPlaying && s.isPreviewEnded ? { isPreviewEnded: false } : {}),
        })),

      next: () => {
        const {
          queue,
          currentIndex,
          repeat,
          shuffle,
          currentTrack,
          history,
          activeShuffleCollectionId,
          shuffleQueues,
        } = get();
        if (queue.length === 0) return;

        if (repeat === "one") {
          set({ currentTime: 0 });
          return;
        }

        // Persistent per-playlist shuffle path
        if (shuffle && activeShuffleCollectionId) {
          const entry = shuffleQueues[activeShuffleCollectionId];
          if (entry) {
            let nextPosition = entry.position + 1;
            let order = entry.order;

            if (nextPosition >= order.length) {
              // End of shuffled queue — reshuffle in place.
              if (queue.length === 1 && repeat === "off") {
                set({ isPlaying: false });
                return;
              }
              order = fisherYates(queue.map((t) => t.id));
              nextPosition = 0;
              // For single-track playlists with repeat==="all", this just loops.
            }

            const nextTrackId = order[nextPosition];
            const nextTrack =
              queue.find((t) => t.id === nextTrackId) ?? queue[0];
            const nextQueueIndex = queue.findIndex((t) => t.id === nextTrack.id);

            const newHistory = currentTrack
              ? [...history, currentTrack].slice(-50)
              : history;

            set({
              shuffleQueues: {
                ...shuffleQueues,
                [activeShuffleCollectionId]: {
                  ...entry,
                  order,
                  position: nextPosition,
                  generatedAt:
                    order === entry.order ? entry.generatedAt : Date.now(),
                },
              },
              currentIndex: nextQueueIndex,
              currentTrack: nextTrack,
              currentTime: 0,
              duration: nextTrack.duration,
              isPlaying: true,
              history: newHistory,
              ...previewStateForTrack(nextTrack),
            });
            return;
          }
        }

        let nextIndex: number;
        if (shuffle) {
          // Fallback: shuffle on without a registered collection (e.g. search results).
          if (queue.length === 1) {
            nextIndex = 0;
          } else {
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
        // Always advances backward by one track. The "seek to start" behavior
        // lives in the UI (single-tap vs double-tap on the back button); lock
        // screen / Bluetooth controls just call this directly, matching the
        // iOS Apple Music / Spotify convention of "previous = previous track".
        const {
          queue,
          currentIndex,
          history,
          currentTrack,
          shuffle,
          repeat,
          activeShuffleCollectionId,
          shuffleQueues,
        } = get();
        if (queue.length === 0 && !currentTrack) return;

        if (history.length > 0) {
          const newHistory = [...history];
          const prevTrack = newHistory.pop()!;
          const queueIndex = queue.findIndex((t) => t.id === prevTrack.id);

          // Keep the persistent shuffle position aligned with what's playing.
          let nextShuffleQueues = shuffleQueues;
          if (shuffle && activeShuffleCollectionId) {
            const entry = shuffleQueues[activeShuffleCollectionId];
            if (entry) {
              const orderIdx = entry.order.indexOf(prevTrack.id);
              if (orderIdx !== -1) {
                nextShuffleQueues = {
                  ...shuffleQueues,
                  [activeShuffleCollectionId]: { ...entry, position: orderIdx },
                };
              }
            }
          }

          set({
            currentTrack: prevTrack,
            currentIndex: queueIndex !== -1 ? queueIndex : currentIndex,
            currentTime: 0,
            duration: prevTrack.duration,
            isPlaying: true,
            history: newHistory,
            shuffleQueues: nextShuffleQueues,
            ...previewStateForTrack(prevTrack),
          });
          return;
        }

        // No history. Walk back through the shuffled order if one is active.
        if (shuffle && activeShuffleCollectionId) {
          const entry = shuffleQueues[activeShuffleCollectionId];
          if (entry) {
            let prevPosition = entry.position - 1;
            if (prevPosition < 0) {
              if (repeat === "all") {
                prevPosition = entry.order.length - 1;
              } else {
                set({ currentTime: 0 });
                return;
              }
            }
            const prevTrackId = entry.order[prevPosition];
            const prevTrack =
              queue.find((t) => t.id === prevTrackId) ?? queue[0];
            const queueIndex = queue.findIndex((t) => t.id === prevTrack.id);
            set({
              shuffleQueues: {
                ...shuffleQueues,
                [activeShuffleCollectionId]: {
                  ...entry,
                  position: prevPosition,
                },
              },
              currentIndex: queueIndex !== -1 ? queueIndex : currentIndex,
              currentTrack: prevTrack,
              currentTime: 0,
              duration: prevTrack.duration,
              isPlaying: true,
              ...previewStateForTrack(prevTrack),
            });
            return;
          }
        }

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
        // Non-shuffle entry point: detach any persistent shuffle queue so
        // next() doesn't try to drive playback from a stale order.
        set({
          queue: tracks,
          currentIndex: startIndex,
          currentTrack: startTrack,
          currentTime: 0,
          duration: startTrack?.duration ?? 0,
          isPlaying: true,
          isMiniPlayerVisible: true,
          history: newHistory,
          activeShuffleCollectionId: null,
          ...previewStateForTrack(startTrack),
        });
      },

      playTrack: (track, queue) => {
        const state = get();

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

        // Keep the active per-playlist shuffle queue aligned with what's
        // actually playing. If the tapped track is part of the active
        // shuffled order, advance position to match it. If it isn't, detach
        // the shuffle queue so a subsequent next() doesn't jump from a stale
        // position into an unrelated song.
        let nextShuffleQueues = state.shuffleQueues;
        let nextActiveId = state.activeShuffleCollectionId;
        if (state.activeShuffleCollectionId) {
          const entry = state.shuffleQueues[state.activeShuffleCollectionId];
          if (entry) {
            const orderIdx = entry.order.indexOf(track.id);
            if (orderIdx !== -1) {
              nextShuffleQueues = {
                ...state.shuffleQueues,
                [state.activeShuffleCollectionId]: { ...entry, position: orderIdx },
              };
            } else {
              nextActiveId = null;
            }
          }
        }

        const baseState = {
          currentTrack: track,
          currentTime: 0,
          duration: track.duration,
          isPlaying: true,
          isMiniPlayerVisible: true,
          history: newHistory,
          shuffleQueues: nextShuffleQueues,
          activeShuffleCollectionId: nextActiveId,
          ...previewStateForTrack(track),
        };

        if (index === -1) {
          set({ queue: [track], currentIndex: 0, ...baseState });
        } else {
          set({ queue: q, currentIndex: index, ...baseState });
        }
      },

      startShuffledCollection: (collectionId, tracks) => {
        if (tracks.length === 0) return;

        const { shuffleQueues, currentTrack, history } = get();
        const sourceHash = computeSourceHash(tracks);
        const existing = shuffleQueues[collectionId];

        let entry: ShuffleQueueEntry;

        if (existing && existing.sourceHash === sourceHash) {
          // Resume from saved position. Clamp defensively.
          const clampedPosition = Math.max(
            0,
            Math.min(existing.position, existing.order.length - 1)
          );
          entry = { ...existing, position: clampedPosition };
        } else {
          // Generate a fresh shuffle. Preserve current track if it's still in
          // the playlist by floating it to the head of the new order.
          const ids = tracks.map((t) => t.id);
          let order = fisherYates(ids);
          const preserveId =
            currentTrack && ids.includes(currentTrack.id)
              ? currentTrack.id
              : null;
          if (preserveId) {
            order = [preserveId, ...order.filter((id) => id !== preserveId)];
          }
          entry = {
            order,
            position: 0,
            sourceHash,
            generatedAt: Date.now(),
          };
        }

        const orderedQueue = tracksFromOrder(entry.order, tracks);
        const startTrack = orderedQueue[entry.position] ?? null;

        const newHistory =
          currentTrack && currentTrack.id !== startTrack?.id
            ? [...history, currentTrack].slice(-50)
            : history;

        set({
          shuffleQueues: { ...shuffleQueues, [collectionId]: entry },
          activeShuffleCollectionId: collectionId,
          queue: orderedQueue,
          currentIndex: entry.position,
          currentTrack: startTrack,
          currentTime: 0,
          duration: startTrack?.duration ?? 0,
          isPlaying: true,
          isMiniPlayerVisible: true,
          shuffle: true,
          history: newHistory,
          ...previewStateForTrack(startTrack),
        });
      },

      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      // Flips the shuffle flag only. Does NOT create a persistent queue —
      // only startShuffledCollection (the collection-level shuffle-play button)
      // does that.
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
    }),
    {
      name: "hymnz-player-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences and per-playlist shuffle memory.
      // Runtime playback state (queue, currentTrack, isPlaying, etc.) is
      // intentionally excluded so audio never auto-starts on cold launch.
      partialize: (s) => ({
        shuffleQueues: s.shuffleQueues,
        activeShuffleCollectionId: s.activeShuffleCollectionId,
        shuffle: s.shuffle,
        repeat: s.repeat,
        volume: s.volume,
      }),
    }
  )
);
