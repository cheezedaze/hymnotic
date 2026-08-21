# Native Playback Ownership — Design

**Date:** 2026-08-21
**Status:** Pending owner review

## Problem

HYMNZ currently delegates mobile playback to a browser `HTMLAudioElement` inside the Capacitor WebView. React and Zustand choose tracks, report whether playback is active, and advance the queue from browser media events. This is adequate for foreground web playback, but it does not give iOS or Android durable ownership of a music session.

The current architecture produces several user-visible failure modes:

- iOS may silence or suspend playback after the screen locks or the app moves to the background.
- A buffered track may finish while the WebView is suspended, preventing JavaScript from handling `ended` and advancing the queue.
- Android has no foreground media playback service, media notification, or native media session.
- The UI can report “playing” after the operating system or media element has actually paused because rejected `play()` calls and native interruptions are not reconciled.
- Lock-screen artwork is supplied through browser Media Session metadata with hard-coded MIME type and dimensions that do not match all production artwork.
- Queue, repeat, shuffle, retry, and error behavior live in UI state rather than in a durable playback engine.

The goal is for HYMNZ to behave as an operating-system-recognized music player while preserving the existing React interface, catalog, subscriptions, access limits, signed media delivery, and web experience.

## Product decisions

- **Native ownership on mobile:** iOS and Android native engines are the authoritative queue and playback state owners whenever the installed binary supports the HYMNZ playback protocol.
- **Web ownership on the web:** the existing `HTMLAudioElement` approach remains available through a hardened web playback adapter.
- **One UI:** React remains the shared visual interface. Native playback does not introduce separate SwiftUI or Android UI screens.
- **Commands down, events up:** React sends commands to the selected engine and renders engine snapshots. It never independently claims that a command succeeded.
- **Server-enforced access:** visitor, free, Sacred 7, one-free-listen, and paid decisions remain on the server. Native code never determines entitlement.
- **Just-in-time stream resolution:** the native engine resolves a playable stream only when a track is about to play. Loading a queue does not consume free listens or mint every stream URL in advance.
- **Safe mixed-version operation:** the live website continues to work in older native binaries that do not contain the playback plugin.
- **One release, staged activation:** the binary can contain native playback while a server-controlled flag determines which compatible installations use it.
- **No automatic cold-start playback:** relaunching HYMNZ restores the previous queue and position as paused. Playback resumes only after a user or operating-system media-control action.

## Scope

The first native playback release includes:

- background and lock-screen audio;
- queue loading and advancement;
- play, pause, seek, next, previous, repeat, and shuffle;
- authoritative buffering, playing, paused, ended, interrupted, and failed states;
- lock-screen, Control Center, notification, Bluetooth, and headset controls;
- title, artist, album/collection, duration, progress, queue position, and normalized artwork metadata;
- audio focus, phone/Siri/system interruption, and route-change handling;
- just-in-time stream resolution and expiration recovery;
- native state persistence and foreground reconciliation;
- structured playback telemetry;
- a runtime fallback to the web engine;
- automated contract/state tests and physical-device soak verification.

## Out of scope

- Offline downloads.
- Crossfade or configurable gapless transitions.
- Spotify Connect-style cross-device control.
- CarPlay or Android Auto catalog browsing.
- Chromecast, AirPlay route-picking UI, or remote casting orchestration.
- Lossless quality selection or adaptive bitrate packaging.
- A server-synchronized queue shared between multiple devices.
- Native rewrites of the existing React screens.
- Changes to subscription prices, Sacred 7 membership, preview durations, or free-listen policy.

## Architecture

The React application talks to one playback-controller interface. At runtime the controller selects either the native adapter or web adapter.

```text
React player UI
        |
        v
PlaybackController (TypeScript contract)
        |
        +-----------------------------+
        |                             |
        v                             v
NativePlaybackAdapter          WebPlaybackAdapter
        |                             |
        v                             v
HymnzPlayback plugin           HTMLAudioElement
   |             |
   v             v
iOS engine   Android service
   |             |
   +-------> playback API <-------+
                  |
                  v
          CloudFront / preview proxy
```

On a compatible mobile installation, the native engine owns:

- the active queue and queue revision;
- current queue index and track identity;
- current position and duration;
- actual playback and buffering state;
- repeat and shuffle behavior;
- native media-session metadata;
- stream URL lifetime and retry state;
- interruption and audio-route behavior;
- resumable paused state.

Zustand becomes a UI read-model on mobile. It may retain non-playback presentation fields such as whether Now Playing or lyrics are expanded, but it does not independently advance the native queue or set actual playback state.

## Playback protocol

### Protocol compatibility

The custom Capacitor plugin is named `HymnzPlayback`. It reports a numeric protocol version. The first implementation uses version `1`.

React selects native playback only when all of the following are true:

1. Capacitor reports a native platform.
2. `HymnzPlayback` is available.
3. `HymnzPlayback.getCapabilities()` reports `protocolVersion >= 1`.
4. The server-delivered native-playback feature flag is enabled for the installation.

Any failure selects `WebPlaybackAdapter`. This check protects old store binaries from live web deployments that contain native playback code.

### Commands

The version 1 command contract supports:

```ts
interface PlaybackEngine {
  getCapabilities(): Promise<PlaybackCapabilities>;
  configureSession(input: ConfigurePlaybackSession): Promise<void>;
  loadQueue(input: LoadQueueInput): Promise<PlaybackSnapshot>;
  play(): Promise<PlaybackSnapshot>;
  pause(): Promise<PlaybackSnapshot>;
  seek(input: { positionSeconds: number }): Promise<PlaybackSnapshot>;
  next(): Promise<PlaybackSnapshot>;
  previous(): Promise<PlaybackSnapshot>;
  setRepeat(input: { mode: RepeatMode }): Promise<PlaybackSnapshot>;
  setShuffle(input: { enabled: boolean }): Promise<PlaybackSnapshot>;
  getState(): Promise<PlaybackSnapshot>;
  clear(): Promise<void>;
  addListener(
    event: "playbackStateChanged",
    listener: (snapshot: PlaybackSnapshot) => void
  ): Promise<{ remove: () => Promise<void> }>;
}
```

Commands return the engine’s resulting snapshot. React does not optimistically mark a command successful before receiving that response or a newer event.

The supporting command types are:

```ts
interface PlaybackCapabilities {
  protocolVersion: 1;
  platform: "web" | "ios" | "android";
  supportsBackgroundPlayback: boolean;
  supportsSystemControls: boolean;
}

interface ConfigurePlaybackSession {
  playbackToken: string | null;
  playbackTokenExpiresAt: string | null;
  installationId: string;
}

interface LoadQueueInput {
  items: PlaybackQueueItem[];
  startIndex: number;
  startPositionSeconds?: number;
  repeat: RepeatMode;
  shuffle: boolean;
}
```

`playbackToken` is null for a visitor session. `startIndex` must address an item in a non-empty queue, and `startPositionSeconds` is clamped to the resolved playable duration. A load request with no items clears the engine rather than calling `loadQueue`.

### Queue item

Queue loading passes metadata and stable identifiers, not playable audio URLs:

```ts
interface PlaybackQueueItem {
  queueItemId: string;
  trackId: string;
  title: string;
  artist: string;
  collectionId: string;
  collectionTitle: string | null;
  durationSeconds: number | null;
  artwork: ArtworkCandidate[];
}

interface ArtworkCandidate {
  url: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  role: "track" | "collection" | "brand";
}
```

`queueItemId` identifies an occurrence within this queue, allowing the same track to appear more than once. Artwork candidates are ordered track, collection, then brand. The native engine tries them in order and reports the selected role or an artwork failure diagnostic.

### Authoritative snapshot

```ts
type PlaybackStatus =
  | "idle"
  | "resolving"
  | "loading"
  | "buffering"
  | "playing"
  | "paused"
  | "interrupted"
  | "ended"
  | "failed";

type RepeatMode = "off" | "all" | "one";

type PlaybackReason =
  | "userCommand"
  | "remoteCommand"
  | "queueLoaded"
  | "itemEnded"
  | "queueExhausted"
  | "interruptionBegan"
  | "interruptionEnded"
  | "routeChanged"
  | "audioFocusLost"
  | "retry"
  | "authenticationRequired"
  | "engineFallback"
  | "restored";

type PlaybackFailureCode =
  | "authentication_required"
  | "entitlement_denied"
  | "track_unavailable"
  | "offline"
  | "network_timeout"
  | "rate_limited"
  | "stream_expired"
  | "decoder_failed"
  | "engine_failed"
  | "unsupported_protocol";

interface PlaybackFailure {
  code: PlaybackFailureCode;
  message: string;
  recoverable: boolean;
  trackId: string | null;
  attempt: number;
  retryAfterSeconds: number | null;
}

interface PlaybackSnapshot {
  protocolVersion: 1;
  sessionId: string;
  sequence: number;
  queueRevision: string;
  status: PlaybackStatus;
  queueIndex: number;
  queueLength: number;
  trackId: string | null;
  positionSeconds: number;
  durationSeconds: number;
  bufferedSeconds: number;
  repeat: RepeatMode;
  shuffle: boolean;
  reason: PlaybackReason | null;
  error: PlaybackFailure | null;
}
```

`sequence` increases for every state mutation within a playback session. React ignores an event with a lower sequence than the newest snapshot it has already applied. A new `sessionId` replaces the previous session. `queueRevision` changes whenever queue membership or order changes.

Position events are rate-limited to approximately four updates per second while the app is foregrounded and one update per second or less while backgrounded. Discrete changes such as track, status, interruption, and failure emit immediately.

## Queue behavior

- Loading a queue assigns a new session ID and queue revision.
- With repeat off, reaching the final queue item stops after that item.
- Repeat all restarts at the first item after the final item.
- Repeat one seeks the current native item to zero and replays it without asking React to reload the track.
- Shuffle produces a stable permutation containing each queue item exactly once before exhaustion.
- Toggling shuffle off restores canonical queue order while preserving the current track.
- Previous follows common music-player behavior: restart the current track when position is greater than three seconds; otherwise move to the previous queue item when one exists.
- A failed item may be skipped only after its retry policy is exhausted. The failure and skip reason are emitted and recorded.
- Loading queue metadata never consumes a one-free-listen grant. Resolution at the moment of play is the consumption boundary.

## Playback authentication and media delivery

### Why the existing cookie path is insufficient

The native social-login flow issues an Auth.js-compatible HttpOnly cookie to the WebView. AVPlayer and ExoPlayer run outside the browser request lifecycle and cannot be assumed to share that cookie. The native engine also must resolve the next track while JavaScript is suspended.

### Playback session token

An authenticated WebView creates a native playback session through `POST /api/playback/session`. The server authenticates the existing Auth.js cookie, creates a cryptographically random opaque token, stores only its SHA-256 hash, and returns the token once. The database record contains:

- token hash;
- user ID;
- created timestamp;
- expiration timestamp;
- revoked timestamp;
- last-used timestamp;
- optional device installation identifier for diagnostics.

The token:

- is accepted only by playback session/resolve/revoke endpoints;
- carries no account-management authority;
- expires after 24 hours;
- is rotated on each authenticated native app bootstrap;
- is revoked on sign-out when connectivity permits;
- is stored in iOS Keychain or Android encrypted preferences;
- is never persisted in Zustand or browser local storage.

Visitors do not receive an authenticated token. The native engine may resolve visitor previews without a bearer token, subject to visitor rate limits.

If the WebView later reports a changed account or tier, it rotates the playback token and calls `configureSession` with the new token. The server always reads current account data during track resolution, so a token does not freeze premium status for 24 hours.

### Just-in-time resolver

Before preparing an item, the native engine calls `POST /api/playback/resolve` with the track ID and playback bearer token when present. The server reuses the existing access-policy functions and free-listen grant transaction.

The response is:

```ts
interface PlaybackResolution {
  trackId: string;
  streamUrl: string;
  streamExpiresAt: string;
  access: "full" | "preview";
  playableDurationSeconds: number;
  artwork: ArtworkCandidate[];
}
```

For full playback, `streamUrl` is a short-lived CloudFront signed URL. For preview playback, it is a short-lived signed preview-ticket URL that supports byte-range requests without relying on a WebView cookie. The preview ticket encodes or references the track, capped preview duration, and expiration and cannot be used for another track.

Resolution for a free user’s one full listen performs the existing atomic grant at this point. Repeated range requests and seeks within the resolved item do not consume another grant.

The server’s existing `/api/tracks/{id}/audio` route remains operational for old binaries and the web adapter. Access-decision and capped-range logic are extracted into shared server functions so the old and new endpoints cannot drift.

### Expiration and retry

- The native engine resolves the current item just before preparation and may resolve only the immediately upcoming item as a latency optimization.
- A 401 revokes the native playback session locally, emits `authenticationRequired`, and pauses without silently skipping.
- A 403 from an expired full URL triggers one fresh resolution and retry.
- A 404 or inactive track is non-retryable and advances only according to the failed-item policy.
- A 429 waits for the server-provided retry interval and reports a recoverable failure.
- Network timeouts use bounded exponential backoff with jitter and stop after three attempts.
- Resolver or playback failures never mutate entitlement locally.

## iOS design

The iOS plugin uses `AVQueuePlayer` or an `AVPlayer` managed by a focused queue coordinator. It configures `AVAudioSession` with category `.playback` and activates the session only when playback is requested.

The app enables the Audio background mode in addition to its existing remote-notification mode. The player publishes Now Playing information through `MPNowPlayingInfoCenter` and registers supported actions with `MPRemoteCommandCenter`.

The engine handles:

- play, pause, next, previous, and change-playback-position commands;
- elapsed time, duration, rate, queue index/count, title, artist, collection, and artwork metadata;
- interruption began/ended notifications and the system’s should-resume recommendation;
- audio route changes, including pausing when headphones or Bluetooth output disconnects;
- item completion and native queue advancement while the WebView is suspended;
- stalled playback and AVPlayer item failures;
- secure playback-token storage;
- paused queue/position persistence;
- artwork decoding and memory/disk caching.

The engine does not automatically resume after an app relaunch. It may resume after a transient interruption only when the operating system recommends resumption and the user had been playing immediately before the interruption.

## Android design

The Android plugin uses Jetpack Media3 ExoPlayer hosted inside a `MediaSessionService`. The foreground service owns the player independently from `MainActivity` and publishes a media-style notification from Media3 session metadata.

The app declares `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, and a service with foreground type `mediaPlayback`. The engine configures media audio attributes, lets ExoPlayer manage audio focus, and enables handling for audio-becoming-noisy events.

The service handles:

- play, pause, seek, next, previous, repeat, and shuffle;
- Android system controls, Bluetooth/headset buttons, and notification actions;
- task removal while playback is active;
- media resumption as a paused session;
- player and HTTP errors with typed diagnostics;
- secure playback-token storage;
- queue/position persistence;
- artwork loading and caching;
- state events delivered through the Capacitor plugin when the WebView is attached.

If the WebView is destroyed while playback continues, the service retains state. When a new WebView attaches, `getState()` returns the current authoritative snapshot before the React UI renders player state.

## React and web design

### Controller and adapters

The React code introduces focused modules:

- shared playback types and protocol validation;
- engine selection and feature-flag evaluation;
- `NativePlaybackAdapter` for Capacitor plugin commands/events;
- `WebPlaybackAdapter` wrapping the singleton `HTMLAudioElement`;
- a controller hook that translates catalog tracks into queue metadata;
- snapshot-to-Zustand synchronization;
- structured telemetry emission.

The existing `useAudioPlayer` responsibilities move into the web adapter. The current Media Session hook remains web-only. Native installations do not publish competing browser Media Session metadata while the native engine is active.

### Zustand responsibilities

Zustand retains:

- the latest authoritative playback snapshot used by the UI;
- queue metadata needed for rendering;
- lyrics, Now Playing expansion, upgrade modal, and other presentation state;
- user preferences mirrored from the engine, such as repeat and shuffle.

Zustand no longer owns on mobile:

- actual play/pause success;
- native current position;
- background queue advancement;
- interruption state;
- retry decisions;
- direct native audio seeking.

On `appStateChange` to active, the controller calls `getState()` and atomically replaces the playback read-model. It does not replay commands based on stale browser state.

### Web parity

The web adapter implements the same command/snapshot semantics with `HTMLAudioElement`. It observes `play`, `pause`, `waiting`, `playing`, `stalled`, `ended`, and `error` events; propagates rejected commands; and reports MediaError details. This makes React components independent from which engine is selected and improves the website without pretending that the web engine has native background guarantees.

## Artwork design

New uploads are normalized into square RGB derivatives with recorded metadata:

- 512 × 512 JPEG;
- 1024 × 1024 JPEG;
- original asset retained for administrative use when desired.

Artwork records include URL/key, MIME type, width, and height. Existing artwork is backfilled through an idempotent administrative script. The upload flow rejects corrupt or undecodable images and never labels a PNG as JPEG.

Playback metadata uses fallback order:

1. Track derivative
2. Collection derivative
3. Bundled HYMNZ brand artwork

A failed candidate advances to the next candidate. A transient failure may retry once before fallback. The player never leaves a blank artwork surface because one candidate failed.

## Persistence and recovery

Native engines persist only the minimum resumable state:

- queue track IDs and metadata revision;
- canonical queue order and shuffled order;
- current queue index;
- last confirmed position;
- repeat and shuffle settings;
- whether playback was active at the moment the process ended;
- session timestamp.

On a cold launch the engine restores the queue as paused. If catalog metadata is stale, React may refresh the queue after launch without changing the current track unexpectedly.

An engine crash or native process recreation must not cause two players to run. Engine initialization closes or releases any previous player instance before accepting a new session. Selecting native playback pauses and clears the web audio element; falling back to web playback first pauses and releases the native session.

## Error and user experience behavior

The UI distinguishes:

- resolving access;
- loading;
- buffering;
- offline/retrying;
- authentication required;
- unavailable track;
- playback failed.

The play button reflects the authoritative snapshot. Buffering shows a progress indicator without changing to a false paused state. Recoverable errors display concise status and retry automatically within policy. Non-recoverable errors provide Retry and Next actions instead of silently moving through several tracks.

Interruption behavior follows platform expectations:

- incoming call or Siri pauses and marks the session interrupted;
- playback resumes only when the system recommends it and the user was previously playing;
- headphone/Bluetooth disconnection pauses rather than switching unexpectedly to speakers;
- another music app taking audio focus pauses HYMNZ and updates the UI;
- returning to HYMNZ reconciles actual state instead of unconditionally resuming.

## Telemetry

Playback telemetry contains no playback token, signed URL, raw cookie, or user-entered content. Events include:

- engine selected and protocol version;
- playback requested/started/paused/completed;
- time to first audio;
- buffering started/ended and duration;
- item resolution latency and outcome category;
- retry count and failure category;
- background entry/exit and whether playback continued;
- track transition reason;
- interruption and route-change reason;
- artwork candidate/fallback result;
- native crash context when available.

The release dashboard tracks, by platform and app version:

- successful-start rate;
- track-completion rate;
- unexpected-stop rate;
- background continuation rate;
- buffering minutes per listening hour;
- playback failures per 100 starts;
- artwork failure/fallback rate;
- crash-free listening sessions.

## Feature flag and rollout

The playback settings response includes:

- native playback enabled/disabled;
- minimum iOS and Android app versions;
- minimum protocol version;
- deterministic rollout percentage;
- emergency fallback reason for diagnostics.

Rollout assignment is stable per installation. An installation never alternates engines on each launch because the rollout percentage is recomputed randomly.

Release order:

1. Deploy shared server access helpers, playback-session/resolve endpoints, telemetry ingestion, and web adapter with native playback disabled.
2. Verify that old binaries and the website remain on the web adapter.
3. Ship iOS and Android binaries containing protocol version 1.
4. Enable internal/TestFlight/Play internal installations.
5. Complete the physical-device verification matrix.
6. Enable 5 percent of compatible production installations.
7. Advance through 25, 50, and 100 percent only when release gates pass.
8. Retain the web fallback for at least one complete native release cycle.

The emergency flag prevents new sessions from selecting native playback. If a native session is already playing, the controller waits until it is paused or ended before changing engines unless the failure is safety-critical. This prevents an abrupt mid-track engine handoff.

## Release gates

The release cannot advance beyond internal testing until:

- visitor, free, Sacred 7, one-free-listen, paid, and admin access paths match current policy;
- iOS and Android complete at least 20 consecutive tracks with the screen locked;
- a 60-minute background listening session completes on each platform;
- calls, Siri/Assistant, alarms, audio focus, Bluetooth, and headphone disconnection behave as specified;
- repeat, shuffle, previous, seek, queue exhaustion, and URL-expiration tests pass;
- lock-screen/notification metadata and artwork update for mixed JPEG/PNG legacy catalog inputs;
- old store binaries continue to play through the web adapter;
- the native kill switch is verified in a release candidate;
- telemetry records failures without secrets;
- automated playback suites, existing tests, lint for changed files, and production builds pass.

Production rollout pauses automatically or operationally if any of these regress materially from the web-engine baseline:

- unexpected-stop rate;
- playback failure rate;
- crash-free listening sessions;
- access-policy mismatches;
- background continuation rate.

## Testing strategy

Implementation follows red-green-refactor at each boundary.

### Shared contract tests

- Validate every command and snapshot type at the plugin boundary.
- Reject unsupported protocol versions and malformed snapshots.
- Ignore stale sequence numbers and accept a new session ID.
- Verify deterministic engine selection and rollout assignment.
- Verify native-to-web fallback pauses/releases the old engine.

### Server tests

- Playback tokens are stored hashed, scoped, expiring, revocable, and never accepted by ordinary account endpoints.
- Resolution reads current tier rather than token-time tier.
- Queue loading does not consume a free listen; resolving that item for actual playback does.
- Full, Sacred 7, one-free-listen, free preview, and visitor preview return the correct resolution.
- Preview tickets cannot change track or cap and support valid range requests.
- Expired/revoked tokens and tickets fail with stable typed responses.
- The legacy audio route and native resolver share the same access decision functions.

### Web adapter tests

- Commands resolve only after the media element confirms the resulting state or returns a typed failure.
- Play rejection leaves the snapshot paused/failed rather than falsely playing.
- Buffering, stalled, pause, ended, and error events produce correct snapshots.
- Repeat-one restarts the actual media element.
- Shuffle contains every track once before exhaustion and respects repeat off.

### Native tests

- Queue state machines are unit-tested independently from AVPlayer/ExoPlayer wrappers.
- Resolver retries, URL expiration, cancellation, and skip policy are deterministic.
- Interruption and route-change handlers produce expected snapshots.
- Persistence restores a paused queue and prevents duplicate player instances.
- Remote/system commands map to the same engine behavior as UI commands.

### Physical-device matrix

At minimum, verify:

- supported oldest and current iOS versions on physical iPhones;
- representative Android versions including the project minimum and current target generation;
- screen lock, app switching, task removal, Low Power Mode/Doze, Wi-Fi/cellular transition, offline recovery, calls, alarms, Siri/Assistant, wired/Bluetooth route changes, and media controls;
- visitor, free, and paid accounts;
- queues with missing artwork, legacy PNG artwork, current JPEG artwork, duration zero, a failed track, and an expiring stream URL.

## Operational documentation

The implementation produces:

- a playback protocol reference;
- a native build/sync checklist;
- a TestFlight and Play internal-test device script;
- a rollout dashboard/runbook;
- a kill-switch runbook;
- a session handoff template recording completed task, commit, tests, open risks, and exact next task.

The implementation plan uses durable checkboxes and task IDs so a new agent session can read the spec, inspect the plan, run the documented status commands, and continue at the first unchecked task without relying on chat history.

## Success criteria

The project is complete when compatible iOS and Android builds use native playback by default at 100 percent rollout, all release gates remain satisfied, old binaries continue to function through the web adapter, and the kill switch can safely prevent new native sessions without a store submission.

Users must be able to start a queue, lock the phone or switch apps, listen through at least 20 consecutive tracks, control playback from system surfaces, and return to a React UI that immediately reflects the true native state.
