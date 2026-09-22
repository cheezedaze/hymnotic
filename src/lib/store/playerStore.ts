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

export interface PlayerState {
  queue: ApiTrack[];
  sourceQueue: ApiTrack[];
  queueCollectionId: string | null;
  currentIndex: number;
  currentTrack: ApiTrack | null;

  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;

  shuffle: boolean;
  repeat: RepeatMode;

  history: ApiTrack[];

  // Track IDs the user consumed their one free full listen on THIS session.
  // In-memory only (not persisted) — a reload refetches authoritative server data.
  freeListenPlayed: string[];

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
  next: (automatic?: boolean) => void;
  previous: () => void;
  seekTo: (time: number) => void;
  setQueue: (tracks: ApiTrack[], startIndex?: number, collectionId?: string | null) => void;
  playTrack: (track: ApiTrack, queue?: ApiTrack[], collectionId?: string | null) => void;
  startShuffledCollection: (collectionId: string, tracks: ApiTrack[]) => void;
  toggleCollectionShuffle: (collectionId: string, tracks: ApiTrack[]) => void;
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
  markFreeListenPlayed: (trackId: string) => void;
  tryNextSong: () => void;
}

// Mirror of getPreviewDuration("free") in src/lib/auth/access.ts. A free user's
// second (and later) listen of a one-free-listen track cuts off here.
const FREE_LISTEN_PREVIEW_SEC = 60;

/** Compute preview state fields from a track's access metadata. */
function previewStateForTrack(
  track: ApiTrack | null | undefined,
  freeListenPlayed: string[] = []
) {
  // A track played this session as a free full listen is preview-only on replay,
  // even though the server data it was loaded with still says "full".
  const consumedReplay = !!track && freeListenPlayed.includes(track.id);
  const isPreview = (track?.isLocked ?? false) || consumedReplay;
  const previewDur = consumedReplay
    ? FREE_LISTEN_PREVIEW_SEC
    : isPreview
    ? track?.previewDuration ?? null
    : null;
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

function shuffledIds(ids: string[], avoidFirstId?: string): string[] {
  const order = fisherYates(ids);
  if (order.length > 1 && avoidFirstId && order[0] === avoidFirstId) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
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

export function persistedPlayerState(state: PlayerState) {
  return {
    queue: state.queue,
    sourceQueue: state.sourceQueue,
    queueCollectionId: state.queueCollectionId,
    currentIndex: state.currentIndex,
    currentTrack: state.currentTrack,
    currentTime: state.currentTime,
    duration: state.duration,
    isMiniPlayerVisible: state.isMiniPlayerVisible,
    isPreviewMode: state.isPreviewMode,
    previewDuration: state.previewDuration,
    previewCheckpoint: state.previewCheckpoint,
    shuffleQueues: state.shuffleQueues,
    activeShuffleCollectionId: state.activeShuffleCollectionId,
    shuffle: state.shuffle,
    repeat: state.repeat,
    volume: state.volume,
  };
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      sourceQueue: [],
      queueCollectionId: null,
      currentIndex: -1,
      currentTrack: null,

      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,

      shuffle: false,
      repeat: "off",

      history: [],

      freeListenPlayed: [],

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

      next: (automatic = false) => {
        const isAutomatic = automatic === true;
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
              const sourceQueue = get().sourceQueue.length > 0
                ? get().sourceQueue
                : queue;
              order = shuffledIds(
                sourceQueue.map((t) => t.id),
                currentTrack?.id
              );
              nextPosition = 0;
              // A single-track shuffled collection simply starts a new cycle.
            }

            const nextQueue =
              order === entry.order
                ? queue
                : tracksFromOrder(order, get().sourceQueue.length > 0 ? get().sourceQueue : queue);
            const nextTrackId = order[nextPosition];
            const nextTrack =
              nextQueue.find((t) => t.id === nextTrackId) ?? nextQueue[0];
            const nextQueueIndex = nextQueue.findIndex((t) => t.id === nextTrack.id);

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
              queue: nextQueue,
              currentIndex: nextQueueIndex,
              currentTrack: nextTrack,
              currentTime: 0,
              duration: nextTrack.duration,
              isPlaying: true,
              history: newHistory,
              ...previewStateForTrack(nextTrack, get().freeListenPlayed),
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
            if (repeat === "all" || !isAutomatic) {
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
          ...previewStateForTrack(nextTrack, get().freeListenPlayed),
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
          let prevTrack: ApiTrack | undefined;
          let queueIndex = -1;
          while (newHistory.length > 0 && queueIndex === -1) {
            const candidate = newHistory.pop()!;
            const candidateIndex = queue.findIndex((t) => t.id === candidate.id);
            if (candidateIndex !== -1) {
              prevTrack = candidate;
              queueIndex = candidateIndex;
            }
          }

          if (prevTrack) {
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
              currentIndex: queueIndex,
              currentTime: 0,
              duration: prevTrack.duration,
              isPlaying: true,
              history: newHistory,
              shuffleQueues: nextShuffleQueues,
              ...previewStateForTrack(prevTrack, get().freeListenPlayed),
            });
            return;
          }
          set({ history: [] });
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
              ...previewStateForTrack(prevTrack, get().freeListenPlayed),
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
          ...previewStateForTrack(prevTrack, get().freeListenPlayed),
        });
      },

      seekTo: (time) => set({ currentTime: time }),

      setQueue: (tracks, startIndex = 0, collectionId = null) => {
        const { currentTrack, history, queueCollectionId } = get();
        const sameCollection = queueCollectionId === collectionId;
        const newHistory =
          sameCollection && currentTrack && currentTrack.id !== tracks[startIndex]?.id
            ? [...history, currentTrack].slice(-50)
            : sameCollection ? history : [];

        const startTrack = tracks[startIndex] ?? null;
        // Non-shuffle entry point: detach any persistent shuffle queue so
        // next() doesn't try to drive playback from a stale order.
        set({
          queue: tracks,
          sourceQueue: tracks,
          queueCollectionId: collectionId,
          currentIndex: startIndex,
          currentTrack: startTrack,
          currentTime: 0,
          duration: startTrack?.duration ?? 0,
          isPlaying: true,
          isMiniPlayerVisible: true,
          history: newHistory,
          activeShuffleCollectionId: null,
          shuffle: false,
          ...previewStateForTrack(startTrack, get().freeListenPlayed),
        });
      },

      playTrack: (track, queue, collectionId = null) => {
        const state = get();
        const requestedCollectionId = collectionId ?? track.collectionId ?? null;
        const sameCollection = state.queueCollectionId === requestedCollectionId;

        if (state.currentTrack?.id === track.id && sameCollection) {
          if (!state.isPlaying) {
            set({ isPlaying: true });
          }
          return;
        }

        const newHistory = sameCollection && state.currentTrack && state.currentTrack.id !== track.id
          ? [...state.history, state.currentTrack].slice(-50)
          : sameCollection ? state.history : [];

        const sourceQueue = queue ?? (
          state.sourceQueue.length > 0 ? state.sourceQueue : state.queue
        );
        let q = sourceQueue;
        let nextShuffle = state.shuffle && sameCollection;
        let nextActiveId = nextShuffle ? state.activeShuffleCollectionId : null;
        let nextShuffleQueues = state.shuffleQueues;

        if (nextShuffle && nextActiveId === requestedCollectionId) {
          const entry = state.shuffleQueues[nextActiveId];
          if (entry && entry.sourceHash === computeSourceHash(sourceQueue)) {
            q = tracksFromOrder(entry.order, sourceQueue);
            const orderIdx = entry.order.indexOf(track.id);
            if (orderIdx !== -1) {
              nextShuffleQueues = {
                ...state.shuffleQueues,
                [nextActiveId]: { ...entry, position: orderIdx },
              };
            } else {
              nextShuffle = false;
              nextActiveId = null;
              q = sourceQueue;
            }
          } else {
            nextShuffle = false;
            nextActiveId = null;
          }
        }

        const index = q.findIndex((t) => t.id === track.id);

        const baseState = {
          sourceQueue,
          queueCollectionId: requestedCollectionId,
          currentTrack: track,
          currentTime: state.currentTrack?.id === track.id ? state.currentTime : 0,
          duration: track.duration,
          isPlaying: true,
          isMiniPlayerVisible: true,
          history: newHistory,
          shuffleQueues: nextShuffleQueues,
          activeShuffleCollectionId: nextActiveId,
          shuffle: nextShuffle,
          ...previewStateForTrack(track, get().freeListenPlayed),
        };

        if (index === -1) {
          set({ queue: [track], currentIndex: 0, ...baseState });
        } else {
          set({ queue: q, currentIndex: index, ...baseState });
        }
      },

      startShuffledCollection: (collectionId, tracks) => {
        if (tracks.length === 0) return;

        const state = get();
        const { shuffleQueues, currentTrack, history } = state;
        const sourceHash = computeSourceHash(tracks);
        const existing = shuffleQueues[collectionId];
        const currentBelongsToCollection =
          state.queueCollectionId === collectionId &&
          !!currentTrack &&
          tracks.some((track) => track.id === currentTrack.id);

        let entry: ShuffleQueueEntry;

        if (existing && existing.sourceHash === sourceHash) {
          // Resume the collection's saved cycle. When shuffle is toggled on
          // for the queue that is already loaded, keep the current song.
          const currentPosition = currentBelongsToCollection
            ? existing.order.indexOf(currentTrack.id)
            : -1;
          const clampedPosition = currentPosition >= 0
            ? currentPosition
            : Math.max(0, Math.min(existing.position, existing.order.length - 1));
          entry = { ...existing, position: clampedPosition };
        } else {
          // Generate a fresh shuffle. Preserve current track if it's still in
          // the playlist by floating it to the head of the new order.
          const ids = tracks.map((t) => t.id);
          let order = fisherYates(ids);
          const preserveId =
            currentBelongsToCollection && currentTrack && ids.includes(currentTrack.id)
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
        const keepPosition = currentBelongsToCollection && startTrack?.id === currentTrack?.id;

        const newHistory =
          currentBelongsToCollection && currentTrack && currentTrack.id !== startTrack?.id
            ? [...history, currentTrack].slice(-50)
            : currentBelongsToCollection ? history : [];

        set({
          shuffleQueues: { ...shuffleQueues, [collectionId]: entry },
          activeShuffleCollectionId: collectionId,
          queue: orderedQueue,
          sourceQueue: tracks,
          queueCollectionId: collectionId,
          currentIndex: entry.position,
          currentTrack: startTrack,
          currentTime: keepPosition ? state.currentTime : 0,
          duration: startTrack?.duration ?? 0,
          isPlaying: currentBelongsToCollection ? state.isPlaying : true,
          isMiniPlayerVisible: true,
          shuffle: true,
          history: newHistory,
          ...previewStateForTrack(startTrack, get().freeListenPlayed),
        });
      },

      toggleCollectionShuffle: (collectionId, tracks) => {
        if (tracks.length === 0) return;
        const state = get();
        if (state.shuffle && state.queueCollectionId === collectionId) {
          const restoredIndex = state.currentTrack
            ? tracks.findIndex((track) => track.id === state.currentTrack?.id)
            : 0;
          const currentIndex = restoredIndex >= 0 ? restoredIndex : 0;
          const currentTrack = tracks[currentIndex] ?? null;
          const trackChanged = currentTrack?.id !== state.currentTrack?.id;
          set({
            queue: tracks,
            sourceQueue: tracks,
            currentIndex,
            currentTrack,
            currentTime: trackChanged ? 0 : state.currentTime,
            duration: currentTrack?.duration ?? 0,
            activeShuffleCollectionId: null,
            shuffle: false,
          });
          return;
        }
        get().startShuffledCollection(collectionId, tracks);
      },

      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      toggleShuffle: () => {
        const state = get();
        const source = state.sourceQueue.length > 0 ? state.sourceQueue : state.queue;
        if (state.queueCollectionId && source.length > 0) {
          state.toggleCollectionShuffle(state.queueCollectionId, source);
          return;
        }
        set({ shuffle: !state.shuffle });
      },
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
      markFreeListenPlayed: (trackId) =>
        set((s) =>
          s.freeListenPlayed.includes(trackId)
            ? s
            : { freeListenPlayed: [...s.freeListenPlayed, trackId] }
        ),
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
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const persisted = persistedState as Partial<PlayerState>;
        if (version < 2) {
          return {
            shuffleQueues: persisted.shuffleQueues ?? {},
            repeat: persisted.repeat ?? "off",
            volume: persisted.volume ?? 1,
          } as Partial<PlayerState>;
        }
        return persisted;
      },
      // Persist a paused, resumable queue. isPlaying is deliberately omitted,
      // so reopening the app preloads the last song without auto-playing it.
      partialize: persistedPlayerState,
    }
  )
);
