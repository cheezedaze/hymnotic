import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistedPlayerState, usePlayerStore } from "./playerStore";
import type { ApiTrack } from "@/lib/types";

const memoryStorage = vi.hoisted(() => {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
  vi.stubGlobal("localStorage", storage);
  return storage;
});

function track(id: string, collectionId: string): ApiTrack {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    id,
    collectionId,
    title: id,
    artist: "HYMNZ",
    artworkKey: null,
    artworkUrl: null,
    audioKey: `${id}.mp3`,
    audioUrl: `/api/tracks/${id}/audio`,
    audioFormat: "mp3",
    originalAudioKey: null,
    originalAudioUrl: null,
    videoKey: null,
    videoUrl: null,
    videoThumbnailKey: null,
    videoThumbnailUrl: null,
    duration: 180,
    trackNumber: 1,
    playCount: 0,
    favoriteCount: 0,
    hasVideo: false,
    videoCount: 0,
    hasLyrics: false,
    isActive: true,
    youtubeUrl: null,
    collectionArtworkUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

const initialState = usePlayerStore.getInitialState();

describe("announcement track actions", () => {
  beforeEach(() => {
    memoryStorage.clear();
    usePlayerStore.setState(initialState, true);
  });

  it("inserts next without changing the current audio, time, preview state, or history", () => {
    const tracks = [track("a", "album"), track("b", "album"), track("c", "album")];
    usePlayerStore.getState().setQueue(tracks, 0, "album");
    usePlayerStore.getState().seekTo(42);
    const before = usePlayerStore.getState();
    usePlayerStore.getState().insertTrack(track("new", "other"), false);
    const after = usePlayerStore.getState();
    expect(after.queue.map((t) => t.id)).toEqual(["a", "new", "b", "c"]);
    expect(after.currentTrack).toBe(before.currentTrack);
    expect(after.currentTime).toBe(42);
    expect(after.isPlaying).toBe(true);
    expect(after.history).toBe(before.history);
    expect(after.freeListenPlayed).toEqual([]);
    after.next(true);
    expect(usePlayerStore.getState().currentTrack?.id).toBe("new");
    usePlayerStore.getState().next(true);
    expect(usePlayerStore.getState().currentTrack?.id).toBe("b");
  });

  it("plays now while preserving the remaining queue and preview limits", () => {
    usePlayerStore.getState().setQueue([track("a", "album"), track("b", "album")], 0, "album");
    usePlayerStore.getState().insertTrack({ ...track("new", "other"), isLocked: true, previewDuration: 30 }, true);
    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: { id: "new" }, currentTime: 0, isPlaying: true, isPreviewMode: true, previewDuration: 30 });
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(["a", "new", "b"]);
    usePlayerStore.getState().next();
    expect(usePlayerStore.getState().currentTrack?.id).toBe("b");
  });

  it("moves a previously played track to next and ignores repeated queue clicks", () => {
    const tracks = [track("a", "album"), track("b", "album"), track("c", "album")];
    usePlayerStore.getState().setQueue(tracks, 1, "album");
    usePlayerStore.getState().insertTrack(tracks[0], false);
    usePlayerStore.getState().insertTrack(tracks[0], false);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(["b", "a", "c"]);
    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it("preserves shuffle order and plays the insertion next", () => {
    const tracks = [track("a", "album"), track("b", "album"), track("c", "album")];
    usePlayerStore.getState().startShuffledCollection("album", tracks);
    const order = usePlayerStore.getState().queue.map((t) => t.id);
    usePlayerStore.getState().insertTrack(track("new", "other"), false);
    expect(usePlayerStore.getState().shuffle).toBe(true);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([order[0], "new", ...order.slice(1)]);
    usePlayerStore.getState().next(true);
    expect(usePlayerStore.getState().currentTrack?.id).toBe("new");
    usePlayerStore.getState().next(true);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(order[1]);
  });

  it("starts an idle player, preserves a paused queue, and resumes the same track without duplicating it", () => {
    const song = track("a", "album");
    usePlayerStore.getState().insertTrack(song, true);
    usePlayerStore.getState().seekTo(45);
    usePlayerStore.getState().pause();
    usePlayerStore.getState().insertTrack(song, true);
    expect(usePlayerStore.getState()).toMatchObject({ currentTime: 45, isPlaying: true });
    expect(usePlayerStore.getState().queue).toHaveLength(1);
    usePlayerStore.getState().pause();
    usePlayerStore.getState().insertTrack(track("b", "album"), false);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("ends repeat-one when explicitly adding a different next song", () => {
    usePlayerStore.getState().insertTrack(track("a", "album"), true);
    usePlayerStore.setState({ repeat: "one" });
    usePlayerStore.getState().insertTrack(track("b", "album"), false);
    usePlayerStore.getState().next(true);
    expect(usePlayerStore.getState().currentTrack?.id).toBe("b");
  });
});

describe("player collection shuffle", () => {
  beforeEach(() => {
    memoryStorage.clear();
    usePlayerStore.setState(initialState, true);
    vi.restoreAllMocks();
  });

  it("toggles shuffle for one collection without restarting the current song", () => {
    const tracks = [track("a-1", "a"), track("a-2", "a"), track("a-3", "a")];
    usePlayerStore.getState().setQueue(tracks, 1, "a");
    usePlayerStore.getState().seekTo(42);
    usePlayerStore.getState().pause();

    usePlayerStore.getState().toggleCollectionShuffle("a", tracks);
    expect(usePlayerStore.getState()).toMatchObject({
      queueCollectionId: "a",
      currentTrack: { id: "a-2" },
      currentTime: 42,
      isPlaying: false,
      shuffle: true,
      activeShuffleCollectionId: "a",
    });

    usePlayerStore.getState().toggleCollectionShuffle("a", tracks);
    expect(usePlayerStore.getState()).toMatchObject({
      queueCollectionId: "a",
      currentTrack: { id: "a-2" },
      currentTime: 42,
      isPlaying: false,
      shuffle: false,
      activeShuffleCollectionId: null,
    });
    expect(usePlayerStore.getState().queue.map((item) => item.id)).toEqual([
      "a-1",
      "a-2",
      "a-3",
    ]);
  });

  it("does not carry shuffle into another collection", () => {
    const collectionA = [track("a-1", "a"), track("a-2", "a")];
    const collectionB = [track("b-1", "b"), track("b-2", "b")];
    usePlayerStore.getState().startShuffledCollection("a", collectionA);

    usePlayerStore.getState().playTrack(collectionB[0], collectionB, "b");

    expect(usePlayerStore.getState()).toMatchObject({
      queueCollectionId: "b",
      currentTrack: { id: "b-1" },
      shuffle: false,
      activeShuffleCollectionId: null,
    });
    expect(usePlayerStore.getState().queue.map((item) => item.id)).toEqual([
      "b-1",
      "b-2",
    ]);

    usePlayerStore.getState().previous();
    expect(usePlayerStore.getState().currentTrack?.id).toBe("b-2");
  });

  it("visits the full queue before creating the next shuffle cycle", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const tracks = [
      track("all-1", "a"),
      track("all-2", "b"),
      track("all-3", "c"),
    ];
    usePlayerStore.getState().setQueue(tracks, 0, "all-tracks");
    usePlayerStore.getState().toggleCollectionShuffle("all-tracks", tracks);

    const firstCycle = [usePlayerStore.getState().currentTrack?.id];
    usePlayerStore.getState().next();
    firstCycle.push(usePlayerStore.getState().currentTrack?.id);
    usePlayerStore.getState().next();
    firstCycle.push(usePlayerStore.getState().currentTrack?.id);

    expect(new Set(firstCycle)).toEqual(new Set(tracks.map((item) => item.id)));

    const lastTrack = usePlayerStore.getState().currentTrack?.id;
    usePlayerStore.getState().next();
    expect(usePlayerStore.getState().shuffleQueues["all-tracks"].position).toBe(0);
    expect(usePlayerStore.getState().currentTrack?.id).not.toBe(lastTrack);
  });

  it("persists a paused resume target but never an autoplay flag", () => {
    const tracks = [track("all-1", "a"), track("all-2", "b")];
    usePlayerStore.getState().setQueue(tracks, 1, "all-tracks");
    usePlayerStore.getState().seekTo(73);

    const persisted = persistedPlayerState(usePlayerStore.getState());

    expect(persisted).toMatchObject({
      queueCollectionId: "all-tracks",
      currentTrack: { id: "all-2" },
      currentTime: 73,
    });
    expect(persisted).not.toHaveProperty("isPlaying");
  });

  it("advances a manual Next tap after shuffle is turned off at the end of the source queue", () => {
    const tracks = [track("a-1", "a"), track("a-2", "a"), track("a-3", "a")];
    usePlayerStore.getState().setQueue(tracks, 2, "a");
    usePlayerStore.getState().toggleCollectionShuffle("a", tracks);
    usePlayerStore.getState().toggleCollectionShuffle("a", tracks);

    expect(usePlayerStore.getState()).toMatchObject({
      currentTrack: { id: "a-3" },
      currentIndex: 2,
      shuffle: false,
    });

    usePlayerStore.getState().next();

    expect(usePlayerStore.getState()).toMatchObject({
      currentTrack: { id: "a-1" },
      currentIndex: 0,
      isPlaying: true,
      shuffle: false,
    });
  });

  it("does not treat a Next button click event as an automatic track ending", () => {
    const tracks = [track("a-1", "a"), track("a-2", "a")];
    usePlayerStore.getState().setQueue(tracks, 1, "a");

    const nextFromClick = usePlayerStore.getState().next as unknown as (
      event: object
    ) => void;
    nextFromClick({ type: "click" });

    expect(usePlayerStore.getState()).toMatchObject({
      currentTrack: { id: "a-1" },
      currentIndex: 0,
      isPlaying: true,
      shuffle: false,
    });
  });
});
