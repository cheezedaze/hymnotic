# Native Playback Shared Controller and Web Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one protocol-driven controller own all React playback commands and snapshots, harden browser playback, and select native playback safely only for compatible enabled installations.

**Architecture:** Pure protocol validation, engine selection, queue identity, and snapshot ordering sit below two adapters. `WebPlaybackAdapter` owns the singleton `HTMLAudioElement` and browser Media Session; `NativePlaybackAdapter` wraps the optional Capacitor plugin. A singleton runtime sends commands, accepts authoritative snapshots, and synchronizes Zustand as a UI read-model without allowing web and native engines to play simultaneously.

**Tech Stack:** React 19, TypeScript 5, Zustand 5, Vitest 3, Capacitor 8, HTMLMediaElement, Media Session API.

**Spec:** `docs/superpowers/specs/2026-08-21-native-playback-ownership-design.md`

## Global Constraints

- Consume protocol types from `src/lib/playback/types.ts`; do not fork or rename version 1 fields.
- Commands return resulting snapshots; React never optimistically flips `isPlaying`.
- Accept a lower sequence only when `sessionId` changes; stale events from a released engine are ignored.
- At most one main playback engine may own audio. Selecting native clears web audio; falling back pauses and clears native first.
- Old binaries, web browsers, a missing plugin, capability failure, malformed capability response, disabled settings, version mismatch, and protocol mismatch all select web.
- `WebPlaybackAdapter` reports actual media-element events and rejected promises; it cannot claim native background support.
- Zustand keeps render metadata and presentation state but does not advance a native queue, synthesize native time, or resolve native retry policy.
- On native app foreground, reconcile with `getState()` before rendering an updated play/pause state.
- Playback tokens are passed directly from the session response to `configureSession`; never write them to localStorage, sessionStorage, Zustand, logs, analytics, or error text.
- Installation ID may be stored in Capacitor Preferences; it is not a credential.
- Browser Media Session is enabled only for the web adapter.
- Preserve existing preview upgrade behavior on web; native preview enforcement remains server/native-owned.

## File map

### Protocol and pure state

- Create `src/lib/playback/protocol.ts` and test — strict snapshot/capability validation.
- Create `src/lib/playback/snapshot-order.ts` and test — session/sequence acceptance.
- Create `src/lib/playback/queue.ts` and test — queue item IDs, stable shuffle, previous behavior.
- Create `src/lib/playback/engine-selection.ts` and test — fail-closed native selection.
- Create `src/lib/playback/installation.ts` and test — stable installation ID.

### Engines and controller

- Create `src/lib/playback/PlaybackEngine.ts` — adapter interface re-export.
- Create `src/lib/playback/WebPlaybackAdapter.ts` and test — HTML audio owner.
- Create `src/lib/playback/web-media-session.ts` and test — browser metadata/actions.
- Create `src/lib/playback/native-plugin.ts` and test — Capacitor protocol declaration.
- Create `src/lib/playback/NativePlaybackAdapter.ts` and test — optional native bridge.
- Create `src/lib/playback/playback-runtime.ts` and test — singleton command/snapshot authority.
- Create `src/lib/hooks/usePlaybackController.ts` and test — bootstrap/reconcile lifecycle.
- Modify `src/components/layout/AppShell.tsx` — mount controller once.
- Retire `src/lib/hooks/useAudioPlayer.ts` and `src/lib/hooks/useMediaSession.ts` after responsibilities move.

### Store, UI, authentication, and telemetry

- Modify `src/lib/store/playerStore.ts` and create `playerStore.test.ts` — authoritative read-model.
- Modify `src/lib/store/subscriptionStore.ts` — bootstrap after resolved tier.
- Create `src/lib/playback/playback-session-client.ts` and test — mint/revoke token without persistence.
- Create `src/lib/auth/sign-out-with-playback.ts` and test — revoke/clear before Auth.js sign-out.
- Modify all sign-out call sites to use the wrapper.
- Create `src/lib/playback/telemetry-client.ts` and test — bounded batches and redaction.
- Create `src/components/player/PlaybackArtwork.tsx` and test — candidate fallback.
- Create `src/components/player/PlaybackStatus.tsx` and test — typed buffering/error UX.
- Modify player components to dispatch commands and render authoritative fields.
- Modify `package.json`, `package-lock.json`, and generated Capacitor files — add App and Preferences plugins plus component-test dependencies.

---

### Task NP-WEB-01: Validate protocol snapshots and queue identity

**Prerequisites:** `NP-SRV-01`.

**Files:**
- Create: `src/lib/playback/protocol.ts`
- Create: `src/lib/playback/protocol.test.ts`
- Create: `src/lib/playback/snapshot-order.ts`
- Create: `src/lib/playback/snapshot-order.test.ts`
- Create: `src/lib/playback/queue.ts`
- Create: `src/lib/playback/queue.test.ts`

**Interfaces:**
- Produces: `parsePlaybackCapabilities(value): PlaybackCapabilities | null`.
- Produces: `parsePlaybackSnapshot(value): PlaybackSnapshot | null`.
- Produces: `shouldAcceptSnapshot(current, incoming): boolean`.
- Produces: `toPlaybackQueueItems(tracks, queueNonce): PlaybackQueueItem[]`.
- Produces: `createStableShuffle(queueItemIds, random): string[]` and `previousTarget(positionSeconds, currentIndex): { index; positionSeconds }`.
- Consumers: Every later shared and native contract test.

- [ ] **Step 1: Write strict validator tests**

Create one complete valid snapshot and assert that parsing returns a new typed value. Then remove each required field in table-driven tests and assert null. Explicitly reject `NaN`, negative sequence/index/length/time, a queue index outside a non-empty queue, unknown status/reason/failure code, and protocol version 2.

```ts
expect(parsePlaybackSnapshot(validSnapshot)).toEqual(validSnapshot);
expect(parsePlaybackSnapshot({ ...validSnapshot, sequence: -1 })).toBeNull();
expect(parsePlaybackSnapshot({ ...validSnapshot, status: "pretending" })).toBeNull();
expect(parsePlaybackCapabilities({ protocolVersion: 1, platform: "ios",
  supportsBackgroundPlayback: true, supportsSystemControls: true })).not.toBeNull();
```

- [ ] **Step 2: Write snapshot-order and duplicate-track queue tests**

```ts
expect(shouldAcceptSnapshot({ sessionId: "a", sequence: 4 }, { sessionId: "a", sequence: 3 })).toBe(false);
expect(shouldAcceptSnapshot({ sessionId: "a", sequence: 4 }, { sessionId: "b", sequence: 0 })).toBe(true);

const items = toPlaybackQueueItems([track("same"), track("same")], "load-7");
expect(items.map((item) => item.queueItemId)).toEqual(["load-7:0:same", "load-7:1:same"]);
expect(new Set(createStableShuffle(items.map((i) => i.queueItemId), () => 0.5))).toEqual(
  new Set(items.map((i) => i.queueItemId))
);
expect(previousTarget(3.01, 4)).toEqual({ index: 4, positionSeconds: 0 });
expect(previousTarget(2.99, 4)).toEqual({ index: 3, positionSeconds: 0 });
```

- [ ] **Step 3: Run red**

```bash
npx vitest run src/lib/playback/protocol.test.ts src/lib/playback/snapshot-order.test.ts src/lib/playback/queue.test.ts
```

Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement minimal pure modules**

Validators must check own properties and primitive values explicitly; do not cast untrusted native JSON with `as PlaybackSnapshot`. Queue mapping uses existing `ApiTrack` fields and ordered artwork candidates, always appending the bundled brand candidate. Stable shuffle uses Fisher-Yates with injected randomness so tests are deterministic.

```ts
export function shouldAcceptSnapshot(
  current: Pick<PlaybackSnapshot, "sessionId" | "sequence"> | null,
  incoming: Pick<PlaybackSnapshot, "sessionId" | "sequence">
): boolean {
  return !current || incoming.sessionId !== current.sessionId || incoming.sequence > current.sequence;
}

export function toPlaybackQueueItems(tracks: ApiTrack[], queueNonce: string): PlaybackQueueItem[] {
  return tracks.map((track, index) => ({
    queueItemId: `${queueNonce}:${index}:${track.id}`,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    collectionId: track.collectionId,
    collectionTitle: track.collectionTitle ?? null,
    durationSeconds: track.duration || null,
    artwork: buildArtworkCandidates(track),
  }));
}
```

- [ ] **Step 5: Run green and typecheck**

```bash
npx vitest run src/lib/playback/protocol.test.ts src/lib/playback/snapshot-order.test.ts src/lib/playback/queue.test.ts
npx tsc --noEmit
```

Expected: all focused tests and typecheck PASS.

- [ ] **Step 6: Commit protocol primitives**

Update the ledger to `NP-WEB-02`, then:

```bash
git add src/lib/playback/protocol.ts src/lib/playback/protocol.test.ts src/lib/playback/snapshot-order.ts src/lib/playback/snapshot-order.test.ts src/lib/playback/queue.ts src/lib/playback/queue.test.ts docs/superpowers/plans/2026-08-21-native-playback-02-shared-web-controller.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(playback): validate protocol and queue identity"
```

---

### Task NP-WEB-02: Select engines deterministically and fail closed

**Prerequisites:** `NP-SRV-06`, `NP-WEB-01`.

**Files:**
- Create: `src/lib/playback/engine-selection.ts`
- Create: `src/lib/playback/engine-selection.test.ts`
- Create: `src/lib/playback/installation.ts`
- Create: `src/lib/playback/installation.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `selectPlaybackEngine(input): "native" | "web"` as a pure decision.
- Produces: `getOrCreateInstallationId(storage): Promise<string>`.
- Consumes: `PlaybackCapabilities` and `PlaybackSettingsResponse`.
- Consumers: `NP-WEB-05` controller bootstrap.

- [ ] **Step 1: Add Capacitor lifecycle/preferences dependencies**

```bash
npm install @capacitor/app@^8 @capacitor/preferences@^8
```

Do not run `cap:sync` until `NP-WEB-07` so native generated-file churn is reviewed once.

- [ ] **Step 2: Write the engine-selection truth table**

```ts
it.each([
  [false, true, true, 1, "web"],
  [true, false, true, 1, "web"],
  [true, true, false, 1, "web"],
  [true, true, true, 0, "web"],
  [true, true, true, 1, "native"],
] as const)("selects safely", (nativePlatform, pluginAvailable, enabled, protocolVersion, expected) => {
  expect(selectPlaybackEngine({ nativePlatform, pluginAvailable, enabled, protocolVersion,
    minimumProtocolVersion: 1 })).toBe(expected);
});
```

Also assert any thrown capability/settings call is caught by the bootstrap and produces web.

- [ ] **Step 3: Write installation persistence tests**

Use an injected `{ get(key), set(key, value) }` fake. First call creates a `crypto.randomUUID()` value, second returns the same value, malformed stored values are replaced, and no token-like field is written.

- [ ] **Step 4: Run red and implement**

```bash
npx vitest run src/lib/playback/engine-selection.test.ts src/lib/playback/installation.test.ts
```

The storage key is exactly `hymnz_playback_installation_id`. Accept UUID-format values only. Native uses Capacitor Preferences; web engine selection does not need or create an installation ID.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run src/lib/playback/engine-selection.test.ts src/lib/playback/installation.test.ts
npx tsc --noEmit
git add package.json package-lock.json src/lib/playback/engine-selection.ts src/lib/playback/engine-selection.test.ts src/lib/playback/installation.ts src/lib/playback/installation.test.ts docs/superpowers/plans/2026-08-21-native-playback-02-shared-web-controller.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(playback): select compatible engines safely"
```

Set the ledger to `NP-WEB-03`.

---

### Task NP-WEB-03: Move browser ownership into WebPlaybackAdapter

**Prerequisites:** `NP-WEB-01`.

**Files:**
- Create: `src/lib/playback/PlaybackEngine.ts`
- Create: `src/lib/playback/WebPlaybackAdapter.ts`
- Create: `src/lib/playback/WebPlaybackAdapter.test.ts`
- Create: `src/lib/playback/web-media-session.ts`
- Create: `src/lib/playback/web-media-session.test.ts`
- Modify: `src/lib/audio/audioContext.ts`
- Modify: `src/lib/audio/voiceoverContext.ts`
- Retire after migration: `src/lib/hooks/useAudioPlayer.ts`
- Retire after migration: `src/lib/hooks/useMediaSession.ts`

**Interfaces:**
- `PlaybackEngine` is the exact interface from the spec.
- Produces: `new WebPlaybackAdapter({ audio, resolveCatalogTrack, mediaSession, clock }): PlaybackEngine`.
- Emits: valid version 1 snapshots for load/resolving/loading/buffering/playing/paused/ended/failed.
- Consumers: Runtime in `NP-WEB-04`.

- [ ] **Step 1: Create an injected media-element test double**

Define `MediaElementPort` with only used properties/methods (`src`, `currentTime`, `duration`, `buffered`, `readyState`, `paused`, `play`, `pause`, `load`, event listener methods). Tests must not instantiate a browser `Audio` object in Vitest’s node environment.

```ts
export interface MediaElementPort {
  src: string;
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  readonly readyState: number;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  removeAttribute(name: "src"): void;
}
```

- [ ] **Step 2: Write failing adapter state tests**

Cover these literal transitions:

```ts
await engine.loadQueue(input);
expect(latest()).toMatchObject({ status: "paused", queueIndex: 0, sequence: 1 });

audio.play.mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
expect(await engine.play()).toMatchObject({ status: "failed",
  error: { code: "engine_failed", recoverable: true } });

audio.dispatch("waiting");
expect(latest().status).toBe("buffering");
audio.dispatch("playing");
expect(latest().status).toBe("playing");
audio.dispatch("ended");
expect(latest()).toMatchObject({ queueIndex: 1, status: "loading" });
```

Also cover stalled/error retry limit, repeat one, repeat all, shuffle exhaustion, previous at 2.9/3.1 seconds, seek clamp, and clear releasing the source.

- [ ] **Step 3: Run red**

```bash
npx vitest run src/lib/playback/WebPlaybackAdapter.test.ts
```

Expected: FAIL because the adapter does not exist.

- [ ] **Step 4: Implement real browser ownership**

Move singleton audio event handling from `useAudioPlayer` into the adapter. Derive the web source as `/api/tracks/${encodeURIComponent(trackId)}/audio`. A command promise resolves only after the media element confirms its state or rejects; use a bounded 10-second command timeout that returns `network_timeout` rather than hanging. Emit position at no more than four times/second. Preserve current preview cutoff/jingle/upgrade callbacks through injected controller callbacks, but never use a JavaScript timer to claim native preview enforcement.

```ts
private installMediaListeners(): void {
  this.listen("waiting", () => this.emitStatus("buffering"));
  this.listen("stalled", () => this.emitStatus("buffering"));
  this.listen("playing", () => this.emitStatus("playing"));
  this.listen("pause", () => this.emitStatus("paused"));
  this.listen("ended", () => void this.advanceAfterEnded());
  this.listen("error", () => void this.handleMediaError());
  this.listen("timeupdate", () => this.emitThrottledPosition());
}
```

- [ ] **Step 5: Move browser Media Session behind the adapter**

`web-media-session.ts` installs play/pause/next/previous/seek handlers that call the adapter, publishes all valid artwork candidates with their real MIME/dimensions, updates position state when supported, and removes every handler on release. It is never initialized by `NativePlaybackAdapter`.

```ts
export function installWebMediaSession(engine: PlaybackEngine): () => void {
  navigator.mediaSession.setActionHandler("play", () => void engine.play());
  navigator.mediaSession.setActionHandler("pause", () => void engine.pause());
  navigator.mediaSession.setActionHandler("nexttrack", () => void engine.next());
  navigator.mediaSession.setActionHandler("previoustrack", () => void engine.previous());
  return () => ["play", "pause", "nexttrack", "previoustrack"].forEach(
    (action) => navigator.mediaSession.setActionHandler(action as MediaSessionAction, null)
  );
}
```

- [ ] **Step 6: Verify adapter and media session**

```bash
npx vitest run src/lib/playback/WebPlaybackAdapter.test.ts src/lib/playback/web-media-session.test.ts
npx tsc --noEmit
```

Expected: command rejection, state events, queue rules, actual MIME metadata, handler cleanup, and source release PASS.

- [ ] **Step 7: Commit web engine**

Do not delete the old hooks until `NP-WEB-04` switches `AppShell`. Update the ledger to `NP-WEB-04`, then commit with:

```bash
git commit -m "feat(playback): own browser audio in web adapter"
```

---

### Task NP-WEB-04: Make the runtime and Zustand consume authoritative snapshots

**Prerequisites:** `NP-WEB-03`.

**Files:**
- Create: `src/lib/playback/playback-runtime.ts`
- Create: `src/lib/playback/playback-runtime.test.ts`
- Modify: `src/lib/store/playerStore.ts`
- Create: `src/lib/store/playerStore.test.ts`
- Create: `src/lib/hooks/usePlaybackController.ts`
- Create: `src/lib/hooks/usePlaybackController.test.ts`
- Modify: `src/components/layout/AppShell.tsx`
- Delete: `src/lib/hooks/useAudioPlayer.ts`
- Delete: `src/lib/hooks/useMediaSession.ts`

**Interfaces:**
- Produces: `getPlaybackRuntime(): PlaybackRuntime` singleton.
- Produces: `EngineSelectionReason = "initialWeb" | "compatibleNative" | "engineFallback" | "killSwitch"`, `runtime.setEngine(next, reason): Promise<void>`, all `PlaybackEngine` commands, and `subscribe(listener)`.
- Produces: Zustand `applyPlaybackSnapshot(snapshot, catalogQueue): void`.
- Maintains existing component-facing actions `play`, `pause`, `togglePlayPause`, `next`, `previous`, `seekTo`, `setQueue`, `playTrack`, `toggleShuffle`, `cycleRepeat` as command dispatchers.
- Consumers: Every player component and native bootstrap.

- [ ] **Step 1: Write runtime handoff tests**

With fake engines, assert:

```ts
await runtime.setEngine(nativeEngine, "compatible");
expect(webEngine.pause).toHaveBeenCalledOnce();
expect(webEngine.clear).toHaveBeenCalledOnce();

webEngine.emit(snapshot({ sessionId: "released", sequence: 99 }));
expect(listener).not.toHaveBeenCalledWith(expect.objectContaining({ sessionId: "released" }));

nativeEngine.emit(snapshot({ sessionId: "n", sequence: 4 }));
nativeEngine.emit(snapshot({ sessionId: "n", sequence: 3 }));
expect(listener).toHaveBeenCalledTimes(1);
```

Fallback performs the symmetric native pause/clear before installing web.

- [ ] **Step 2: Write store reconciliation tests**

Assert that `play()` does not change `isPlaying` before a returned snapshot, a playing snapshot maps `status/isPlaying/currentTime/duration/currentIndex/currentTrack`, stale snapshots do nothing, and UI-only fields (`isLyricsOpen`, expanded state) survive reconciliation.

- [ ] **Step 3: Run red**

```bash
npx vitest run src/lib/playback/playback-runtime.test.ts src/lib/store/playerStore.test.ts
```

Expected: FAIL until runtime and authoritative store action exist.

- [ ] **Step 4: Implement runtime and store bridge**

Runtime serializes engine changes, attaches exactly one listener, increments no snapshot fields itself, and exposes command errors as failed snapshots. Store queue actions first retain the `ApiTrack[]` render queue, map it to protocol items with a fresh queue nonce, call `loadQueue`, then call `play` only when requested. Remove store-owned queue advancement, random selection, direct audio seek, and synthetic current-time intervals after equivalent adapter tests are green.

```ts
export class PlaybackRuntime {
  private engine: PlaybackEngine | null = null;
  private listenerRemoval: { remove(): Promise<void> } | null = null;

  async setEngine(next: PlaybackEngine, reason: EngineSelectionReason): Promise<void> {
    const previous = this.engine;
    if (previous === next) return;
    if (previous) { await previous.pause(); await previous.clear(); }
    if (this.listenerRemoval) await this.listenerRemoval.remove();
    this.engine = next;
    this.listenerRemoval = await next.addListener("playbackStateChanged", this.acceptSnapshot);
  }
}
```

- [ ] **Step 5: Replace AppShell hooks**

`usePlaybackController()` creates/installs the web adapter once, subscribes runtime snapshots to `applyPlaybackSnapshot`, and cleans up the subscription without clearing an active engine on ordinary React re-render. Replace:

```ts
useAudioPlayer();
useMediaSession();
```

with:

```ts
usePlaybackController();
```

Only now delete the two retired hooks and remove unused imports.

- [ ] **Step 6: Verify store/runtime integration**

```bash
npx vitest run src/lib/playback src/lib/store/playerStore.test.ts
npx tsc --noEmit
npx eslint src/lib/playback src/lib/store/playerStore.ts src/lib/hooks/usePlaybackController.ts src/components/layout/AppShell.tsx
```

Expected: all focused tests/typecheck/lint PASS and no `useAudioPlayer`/`useMediaSession` imports remain.

- [ ] **Step 7: Commit controller ownership**

Update the ledger to `NP-WEB-05`, then commit with:

```bash
git commit -m "refactor(playback): synchronize UI from engine snapshots"
```

---

### Task NP-WEB-05: Bridge optional native playback and rotate scoped sessions

**Prerequisites:** `NP-SRV-02`, `NP-SRV-04`, `NP-SRV-06`, `NP-WEB-04`.

**Files:**
- Create: `src/lib/playback/native-plugin.ts`
- Create: `src/lib/playback/NativePlaybackAdapter.ts`
- Create: `src/lib/playback/NativePlaybackAdapter.test.ts`
- Create: `src/lib/playback/playback-session-client.ts`
- Create: `src/lib/playback/playback-session-client.test.ts`
- Modify: `src/lib/hooks/usePlaybackController.ts`
- Modify: `src/lib/hooks/usePlaybackController.test.ts`
- Create: `src/lib/auth/sign-out-with-playback.ts`
- Create: `src/lib/auth/sign-out-with-playback.test.ts`
- Modify: `src/components/auth/SignOutButton.tsx`
- Modify: `src/components/profile/DeleteAccountLink.tsx`
- Modify: `src/components/admin/AdminNav.tsx`
- Modify: `src/components/layout/DesktopSidebar.tsx`

**Interfaces:**
- Produces: `HymnzPlaybackPlugin` TypeScript interface with every version 1 command and `addListener`.
- Produces: `NativePlaybackAdapter(plugin): PlaybackEngine` which validates every native return/event.
- Produces: `createNativePlaybackSession(installationId): Promise<ConfigurePlaybackSession>`; 401 returns null token fields for visitors.
- Produces: `revokeNativePlaybackSession(): Promise<void>`.
- Produces: `signOutWithPlayback(options): Promise<void>`.

- [ ] **Step 1: Declare and test the native bridge**

Register only through:

```ts
export const HymnzPlayback = registerPlugin<HymnzPlaybackPlugin>("HymnzPlayback");
```

Tests mock a valid plugin, malformed command response, stale listener event, listener removal, and a native rejection. Invalid snapshots become a local `unsupported_protocol`/`engine_failed` failure and cause bootstrap fallback; no raw native error text reaches the UI.

- [ ] **Step 2: Write session-client tests**

Mock fetch and assert 200 maps token/expiry, 401 maps `{ playbackToken: null, playbackTokenExpiresAt: null, installationId }`, network failure throws a typed recoverable error, revoke includes `Authorization: Bearer` only from the in-memory closure, and no browser storage API is called.

- [ ] **Step 3: Run red and implement adapter/session client**

```bash
npx vitest run src/lib/playback/NativePlaybackAdapter.test.ts src/lib/playback/playback-session-client.test.ts
```

The adapter delegates commands exactly once, parses all snapshots, stores only the newest accepted snapshot, and exposes a release method used during fallback. The session client holds the raw token only long enough to pass it into native `configureSession`; after native resolves, overwrite the JavaScript variable with null.

- [ ] **Step 4: Add safe bootstrap order**

The hook order is exact:

1. Install web adapter immediately.
2. Check `Capacitor.isNativePlatform()` and `Capacitor.isPluginAvailable("HymnzPlayback")`.
3. Read `App.getInfo()` and stable Preferences installation ID.
4. Call and validate `getCapabilities()`.
5. Fetch playback settings.
6. If selection is native, mint/configure the session.
7. Pause/clear web, install native, and call native `getState()`.
8. On any failure, retain/reinstall web and emit `engineFallback` telemetry.
9. On `App.appStateChange` active, rotate/configure the playback session when its recorded expiry is within five minutes, then call current engine `getState()` and reconcile. A visitor keeps null token fields.

```ts
if (
  Capacitor.isNativePlatform() &&
  Capacitor.isPluginAvailable("HymnzPlayback") &&
  selectPlaybackEngine(decisionInput) === "native"
) {
  const session = await createNativePlaybackSession(installationId);
  await nativeEngine.configureSession(session);
  await runtime.setEngine(nativeEngine, "compatibleNative");
  applyPlaybackSnapshot(await nativeEngine.getState(), catalogQueue);
}
```

- [ ] **Step 5: Revoke before every sign-out path**

`signOutWithPlayback` calls runtime pause/clear, attempts `/api/playback/revoke`, calls native `configureSession` with null token fields, and finally invokes Auth.js `signOut` even if revocation is offline. Replace all four direct sign-out call sites with this wrapper.

- [ ] **Step 6: Verify compatibility paths**

```bash
npx vitest run src/lib/playback/NativePlaybackAdapter.test.ts src/lib/playback/playback-session-client.test.ts src/lib/hooks/usePlaybackController.test.ts src/lib/auth/sign-out-with-playback.test.ts
npx tsc --noEmit
```

Expected: old binary, missing plugin, malformed capability, disabled flag, failed settings, visitor, authenticated token, sign-out offline, and foreground reconciliation cases PASS.

- [ ] **Step 7: Commit native bridge bootstrap**

Update the ledger to `NP-WEB-06`, then commit with:

```bash
git commit -m "feat(playback): bridge compatible native engines"
```

---

### Task NP-WEB-06: Add typed UX, resilient artwork, and telemetry batches

**Prerequisites:** `NP-SRV-05`, `NP-SRV-07`, `NP-WEB-05`.

**Files:**
- Create: `src/components/player/PlaybackArtwork.tsx`
- Create: `src/components/player/PlaybackArtwork.test.tsx`
- Create: `src/components/player/PlaybackStatus.tsx`
- Create: `src/components/player/PlaybackStatus.test.tsx`
- Create: `src/lib/playback/telemetry-client.ts`
- Create: `src/lib/playback/telemetry-client.test.ts`
- Modify: `src/components/player/NowPlaying.tsx`
- Modify: `src/components/player/PlaybackControls.tsx`
- Modify: `src/components/layout/MiniPlayer.tsx`
- Modify: `src/components/layout/DesktopPlayerBar.tsx`
- Modify: `src/lib/hooks/usePlaybackController.ts`
- Modify: `vitest.config.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `<PlaybackArtwork candidates title sizes priority className />`.
- Produces: `<PlaybackStatus status error onRetry onNext />`.
- Produces: `createPlaybackTelemetryClient({ endpoint, flushIntervalMs, maxBatch }): PlaybackTelemetryClient`.

- [ ] **Step 1: Install component-test dependencies and configure jsdom per file**

```bash
npm install --save-dev @testing-library/react @testing-library/user-event jsdom
```

Keep Vitest’s default node environment; add `// @vitest-environment jsdom` only to component tests.

- [ ] **Step 2: Write artwork fallback tests**

Render candidates `[broken track, broken collection, brand]`, fire image errors in order, assert each next URL renders, then assert the Music icon only after brand failure. Rerender with a new `queueItemId` and assert fallback resets to candidate zero. This specifically prevents one failed old image from poisoning all later images.

- [ ] **Step 3: Write status and telemetry tests**

Status copy is exact: `resolving → "Checking access…"`, `loading → "Loading…"`, `buffering → "Buffering…"`, offline recoverable → `"Offline — retrying"`, authentication → `"Sign in again to continue"`, unavailable → `"This track is unavailable"`, other failed → `"Playback couldn’t continue"`. Non-recoverable status exposes Retry and Next buttons.

Telemetry tests assert UUID `eventId` generation, batching at 50, flush on background/pagehide, retry once with unchanged event IDs after network failure, and rejection of any property named token, streamUrl, cookie, lyrics, message, or payload.

- [ ] **Step 4: Implement the components and replace per-screen error booleans**

Use `PlaybackArtwork` in Now Playing, Mini Player, and Desktop Player Bar. Keep visual sizes/layout unchanged. Controls render authoritative `status === "playing"`; buffering shows a spinner but does not switch to a false paused icon. Retry calls runtime `play`; Next calls runtime `next`.

```tsx
<PlaybackArtwork
  key={currentQueueItemId}
  candidates={currentArtworkCandidates}
  title={currentTrack.title}
  sizes="(max-width: 768px) 180px, 48px"
/>
<PlaybackStatus
  status={playbackStatus}
  error={playbackError}
  onRetry={() => void getPlaybackRuntime().play()}
  onNext={() => void getPlaybackRuntime().next()}
/>
```

- [ ] **Step 5: Wire telemetry from runtime events**

Translate engine selection, command requests/results, state transitions, buffering durations, background transitions, retries, failures, interruptions/routes, and artwork fallback into the server allowlist. Send no event more than once per discrete transition and never send position ticks. `playback_started` is emitted once per queue occurrence when audio first becomes audible; the server uses its UUID for idempotent play-count updates, so remove the old direct `/api/tracks/{id}/play` fetch only after this test passes.

```ts
if (previous.status !== "playing" && next.status === "playing" && next.trackId) {
  telemetry.enqueue({
    eventId: crypto.randomUUID(),
    eventName: "playback_started",
    sessionId: next.sessionId,
    trackId: next.trackId,
    occurredAt: new Date().toISOString(),
  });
}
```

- [ ] **Step 6: Verify UX and redaction**

```bash
npx vitest run src/components/player/PlaybackArtwork.test.tsx src/components/player/PlaybackStatus.test.tsx src/lib/playback/telemetry-client.test.ts
npx tsc --noEmit
npx eslint src/components/player src/components/layout/MiniPlayer.tsx src/components/layout/DesktopPlayerBar.tsx src/lib/playback/telemetry-client.ts
```

Expected: fallback reset, typed copy/actions, batching, retry, and secret-key rejection PASS.

- [ ] **Step 7: Commit UX and telemetry**

Update the ledger to `NP-WEB-07`, then commit with:

```bash
git commit -m "feat(playback): surface authoritative playback status"
```

---

### Task NP-WEB-07: Synchronize Capacitor and complete Gate B

**Prerequisites:** `NP-WEB-06`.

**Files:**
- Modify/generated: `ios/App/Podfile.lock`
- Modify/generated: `android/capacitor.settings.gradle`
- Modify/generated: `android/app/capacitor.build.gradle`
- Modify/generated: native Capacitor plugin manifests as produced by Capacitor 8
- Create: `docs/release/native-playback/web-controller-gate.md`

**Interfaces:**
- Produces: A web deployment that defaults every user to the web adapter and a native project ready for platform engine files.
- Consumers: `NP-IOS-01`, `NP-AND-01`, and integration rollout.

- [ ] **Step 1: Run Capacitor sync and inspect only generated dependency changes**

```bash
npm run cap:sync
git diff -- ios android
```

Expected: App/Preferences plugin dependencies are present; no native playback implementation exists yet and no signing/version settings change.

- [ ] **Step 2: Run the full web/shared gate**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all tests, typecheck, lint, and production build PASS.

- [ ] **Step 3: Prove old-binary fallback manually**

With the current `1.0.3` iOS and Android binaries (which have no `HymnzPlayback` plugin), load the updated test deployment and record in `web-controller-gate.md` that play, pause, seek, next, previous, repeat, shuffle, preview, artwork fallback, and system web controls still use `WebPlaybackAdapter`.

- [ ] **Step 4: Prove native remains disabled**

Set the admin enabled field false and rollout zero. Verify settings returns `enabled:false` for valid iOS/Android requests and the browser emits `engine_selected=web` without a token or signed URL.

- [ ] **Step 5: Review diff and commit Gate B**

```bash
git diff --check
git status --short
git add package.json package-lock.json ios android docs/release/native-playback/web-controller-gate.md docs/superpowers/plans/2026-08-21-native-playback-02-shared-web-controller.md docs/superpowers/plans/2026-08-21-native-playback-roadmap.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "chore(playback): complete shared controller gate"
```

Mark Gate B complete and set the status ledger to `NP-IOS-01` for a solo sequence or record both `NP-IOS-01` and `NP-AND-01` as parallel-ready when the user explicitly authorizes parallel implementers.
