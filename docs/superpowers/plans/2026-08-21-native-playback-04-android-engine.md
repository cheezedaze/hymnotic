# Native Playback Android Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement protocol version 1 as an Android Media3 foreground playback service that continues with the screen off or another app foregrounded, owns queue/system controls, publishes accurate notification metadata/artwork, and restores paused state.

**Architecture:** Pure Java protocol/queue models feed a `MediaSessionService` containing the single ExoPlayer. The player queue uses stable occurrence IDs and `hymnz://track/{id}` media URIs; a resolving data source performs just-in-time server resolution only when ExoPlayer opens the current or immediately upcoming item. A Capacitor plugin connects through a `MediaController` and versioned custom session commands, while the Android system controls the same session through standard Player commands.

**Tech Stack:** Android minSdk 24/compileSdk 36/targetSdk 36, Java 17, JUnit 4, Capacitor 8, Jetpack Media3 1.11.0 ExoPlayer/Session/DataSource, Android Keystore, SharedPreferences.

**Spec:** `docs/superpowers/specs/2026-08-21-native-playback-ownership-design.md`

## Global Constraints

- Keep package/application ID `com.hymnz.app`, minSdk 24, compileSdk 36, and targetSdk 36.
- Use stable Media3 `1.11.0` consistently for `media3-exoplayer`, `media3-session`, `media3-datasource`, and test utilities.
- One `HymnzPlaybackService` owns one ExoPlayer and one MediaSession; `MainActivity` and the WebView never own another native player.
- Declare `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`, and the service foreground type `mediaPlayback` while preserving existing permissions.
- Configure media audio attributes, `setAudioAttributes(..., true)`, `setHandleAudioBecomingNoisy(true)`, and network wake mode.
- Loading a queue sets metadata and logical `hymnz://` URIs but does not prepare or resolve media until play.
- Resolver calls may occur for the current and immediately upcoming item only; never resolve the complete queue in advance.
- Store the playback token encrypted with an Android Keystore AES-GCM key; plaintext never enters SharedPreferences.
- Persist approved queue fields only and restore paused; no cold process start may autoplay.
- System notification/lock-screen metadata comes from `MediaItem.MediaMetadata` and the MediaSession, especially on API 33+.
- Ongoing playback survives task removal; paused/stopped/error behavior follows `MediaSessionService` lifecycle.
- Headphone/Bluetooth noisy route pauses; audio focus is delegated to ExoPlayer and snapshot state reconciles from actual player events.
- Previous restarts after 3 seconds; otherwise selects the previous occurrence.
- Emit position snapshots no more than four times/second while the Activity is foregrounded and once/second while it is backgrounded or detached.
- Do not log tokens, authorization headers, signed URLs, cookies, or raw resolver bodies.

## Official implementation references

- Android’s [background playback guide](https://developer.android.com/media/media3/session/background-playback) requires the Player and MediaSession to live in a `MediaSessionService` foreground service and defines the manifest permissions/service declaration.
- Android’s [MediaSession playback guide](https://developer.android.com/media/media3/session/control-playback) describes exposing one Player to system, headset, Assistant, and external controls.
- Android’s [Media3 release page](https://developer.android.com/jetpack/androidx/releases/media3) lists `1.11.0` as the stable release used by this plan.

## File map

- Modify `android/app/build.gradle` — Java 17, Media3 1.11.0, and test dependencies.
- Modify `android/app/src/main/AndroidManifest.xml` — foreground service, wake lock, service declaration.
- Modify `android/app/src/main/java/com/hymnz/app/MainActivity.java` — register local Capacitor plugin before `super.onCreate`.
- Create `android/app/src/main/java/com/hymnz/app/playback/PlaybackModels.java` — exact protocol JSON models.
- Create `android/app/src/main/java/com/hymnz/app/playback/PlaybackQueueState.java` — deterministic occurrence queue.
- Create `android/app/src/main/java/com/hymnz/app/playback/PlaybackStateStore.java` — paused restore.
- Create `android/app/src/main/java/com/hymnz/app/playback/PlaybackTokenStore.java` — Keystore encryption.
- Create `android/app/src/main/java/com/hymnz/app/playback/PlaybackApiClient.java` — resolver HTTP/errors.
- Create `android/app/src/main/java/com/hymnz/app/playback/HymnzResolvingDataSource.java` — `hymnz://` just-in-time resolution.
- Create `android/app/src/main/java/com/hymnz/app/playback/HymnzPlaybackEngine.java` — player/queue/snapshot owner.
- Create `android/app/src/main/java/com/hymnz/app/playback/NativePlaybackTelemetry.java` — durable allowlisted service event batches.
- Create `android/app/src/main/java/com/hymnz/app/playback/ArtworkLoader.java` — ordered artwork retry/fallback and bounded cache.
- Create `android/app/src/main/java/com/hymnz/app/playback/HymnzPlaybackService.java` — foreground MediaSessionService.
- Create `android/app/src/main/java/com/hymnz/app/playback/PlaybackSessionCommands.java` — custom command names.
- Create `android/app/src/main/java/com/hymnz/app/playback/HymnzPlaybackPlugin.java` — Capacitor/MediaController bridge.
- Create `android/app/src/test/java/com/hymnz/app/playback/` — pure unit tests.
- Create `android/app/src/androidTest/java/com/hymnz/app/playback/` — service/plugin integration tests where a device runtime is required.
- Create `docs/release/native-playback/android-internal-test.md` — build and physical-device evidence.

---

### Task NP-AND-01: Add Media3/test dependencies and exact protocol models

**Prerequisites:** `NP-WEB-01`, server resolver available in a test environment.

**Files:**
- Modify: `android/app/build.gradle`
- Create: `android/app/src/main/java/com/hymnz/app/playback/PlaybackModels.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/PlaybackModelsTest.java`

**Interfaces:**
- Produces Java immutable models for capabilities, configure input, artwork, queue item/load input, failure, and snapshot.
- Produces `PlaybackSnapshot.toJSObject()` and strict `LoadQueueInput.fromJSObject(JSObject)`.
- Consumers: Every later Android task and plugin.

- [ ] **Step 1: Add stable dependencies and Java level**

In `android/app/build.gradle` add:

```groovy
def media3Version = "1.11.0"
implementation "androidx.media3:media3-exoplayer:$media3Version"
implementation "androidx.media3:media3-session:$media3Version"
implementation "androidx.media3:media3-datasource:$media3Version"
testImplementation "androidx.media3:media3-test-utils:$media3Version"
```

Inside `android {}` add:

```groovy
compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
}
```

- [ ] **Step 2: Write strict JSON round-trip tests**

```java
@Test public void snapshotUsesProtocolOneCamelCaseKeys() throws Exception {
  PlaybackSnapshot snapshot = Fixtures.playingSnapshot(4);
  JSObject json = snapshot.toJSObject();
  assertEquals(1, json.getInteger("protocolVersion").intValue());
  assertEquals("ios-session".replace("ios", "android"), json.getString("sessionId"));
  assertEquals("playing", json.getString("status"));
  assertFalse(json.has("playbackToken"));
}
```

Add invalid input tests for protocol 2, missing queue item ID, unknown enum, negative/NaN time, invalid start index, and malformed artwork dimensions.

- [ ] **Step 3: Run red**

```bash
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.PlaybackModelsTest'
```

Expected: FAIL because models do not exist.

- [ ] **Step 4: Implement exact immutable models**

Use nested enums with wire strings matching TypeScript. Construct `JSObject` field by field; never serialize Java exception/message objects. Reject any non-finite JSON number and require protocol exactly 1.

```java
JSObject toJSObject() {
  JSObject json = new JSObject();
  json.put("protocolVersion", 1);
  json.put("sessionId", sessionId);
  json.put("sequence", sequence);
  json.put("queueRevision", queueRevision);
  json.put("status", status.wireValue);
  json.put("repeat", repeatMode.wireValue);
  json.put("error", error == null ? JSONObject.NULL : error.toJSObject());
  return json;
}
```

- [ ] **Step 5: Run green/build and commit**

```bash
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.PlaybackModelsTest' assembleDebug
git add android/app/build.gradle android/app/src/main/java/com/hymnz/app/playback/PlaybackModels.java android/app/src/test/java/com/hymnz/app/playback/PlaybackModelsTest.java docs/superpowers/plans/2026-08-21-native-playback-04-android-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(android): add playback protocol models"
```

Set the ledger to `NP-AND-02`.

---

### Task NP-AND-02: Implement deterministic queue state and paused persistence

**Prerequisites:** `NP-AND-01`.

**Files:**
- Create: `android/app/src/main/java/com/hymnz/app/playback/PlaybackQueueState.java`
- Create: `android/app/src/main/java/com/hymnz/app/playback/PlaybackStateStore.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/PlaybackQueueStateTest.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/PlaybackStateStoreTest.java`

**Interfaces:**
- Produces `load`, `next`, `previous`, `setRepeat`, `setShuffle(seed)`, current occurrence/order, and serializable state.
- Produces `PlaybackStateStore.save`, `restore(maxAgeMillis)`, and `clear` against injected key/value storage.
- Consumers: engine/service.

- [ ] **Step 1: Write queue rule tests**

Mirror iOS/TypeScript cases exactly: duplicate track occurrences, repeat off/all/one, single item, seeded shuffle contains every `queueItemId` once, disabling shuffle preserves current occurrence, previous threshold, failed-item advancement only after exhausted retry.

```java
assertEquals(Action.seekCurrentToZero(), queue.previous(3001));
assertEquals(Action.loadIndex(1), loadedAt(2).previous(2999));
```

- [ ] **Step 2: Write persistence tests**

Use an in-memory fake SharedPreferences port. Round-trip canonical/shuffled IDs, index, position milliseconds, repeat, shuffle, active-before-termination, metadata revision, timestamp. Corrupt/version-mismatched/older-than-seven-days state clears. Restore exposes autoplay false regardless of saved active flag.

- [ ] **Step 3: Run red and implement pure Java**

```bash
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.PlaybackQueueStateTest' --tests 'com.hymnz.app.playback.PlaybackStateStoreTest'
```

Use `java.util.Random(seed)` only to generate the stable Fisher-Yates occurrence order; production generates and persists one random long per queue load.

- [ ] **Step 4: Verify and commit**

```bash
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.PlaybackQueueStateTest' --tests 'com.hymnz.app.playback.PlaybackStateStoreTest'
git add android/app/src/main/java/com/hymnz/app/playback/PlaybackQueueState.java android/app/src/main/java/com/hymnz/app/playback/PlaybackStateStore.java android/app/src/test/java/com/hymnz/app/playback/PlaybackQueueStateTest.java android/app/src/test/java/com/hymnz/app/playback/PlaybackStateStoreTest.java docs/superpowers/plans/2026-08-21-native-playback-04-android-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(android): persist deterministic playback queues"
```

Set the ledger to `NP-AND-03`.

---

### Task NP-AND-03: Encrypt the token and resolve `hymnz://` streams just in time

**Prerequisites:** `NP-SRV-04`, `NP-AND-01`.

**Files:**
- Create: `android/app/src/main/java/com/hymnz/app/playback/PlaybackTokenStore.java`
- Create: `android/app/src/main/java/com/hymnz/app/playback/PlaybackApiClient.java`
- Create: `android/app/src/main/java/com/hymnz/app/playback/HymnzResolvingDataSource.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/PlaybackTokenStoreTest.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/PlaybackApiClientTest.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/HymnzResolvingDataSourceTest.java`

**Interfaces:**
- Produces `PlaybackTokenStore.set(token, expiresAt)`, `validToken(clock)`, `clear` using Keystore AES-GCM.
- Produces `PlaybackApiClient.resolve(trackId, token): PlaybackResolution` and typed failure.
- Produces a Media3 `DataSource.Factory` that transforms `hymnz://track/{encodedTrackId}` to a newly resolved HTTPS URL on `open`.
- Consumers: ExoPlayer engine/service.

- [ ] **Step 1: Write token encryption tests through injected crypto/storage ports**

Assert SharedPreferences holds only base64 IV/ciphertext/expiry, never plaintext; alias is `hymnz_playback_session_v1`; null/expired configure clears; decryption failure clears and returns null. Production key is AES/GCM/NoPadding, 256-bit, AndroidKeyStore, no user authentication required.

- [ ] **Step 2: Write resolver HTTP tests**

Use an injected transport and assert POST `https://www.hymnz.com/api/playback/resolve`, JSON track ID, optional bearer, 15-second connect/read timeouts, exact response parse, and typed 401/403/404/429/offline/timeout/server failures. `toString`/logging exposes only code and track ID.

- [ ] **Step 3: Write resolving data-source tests**

Assert constructing queue media items performs zero HTTP calls; opening the current `hymnz://` data spec performs one resolve and delegates the original position/range to HTTPS; reopening after an expired URL resolves again; a request for a non-HYMNZ HTTPS URI passes through unchanged; authentication required maps to a nonretryable `PlaybackException` cause.

- [ ] **Step 4: Run red and implement**

```bash
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.PlaybackTokenStoreTest' --tests 'com.hymnz.app.playback.PlaybackApiClientTest' --tests 'com.hymnz.app.playback.HymnzResolvingDataSourceTest'
```

Use `ResolvingDataSource.Factory(DefaultHttpDataSource.Factory(), resolver)`. Decode exactly one path segment after `/track/`. The resolver may block on ExoPlayer’s loading thread but never on the main thread; enforce the HTTP timeouts.

- [ ] **Step 5: Add bounded retry behavior**

Network timeout/offline retries at approximately 0.5s/1s/2s plus bounded jitter and stops after three attempts. 401/404 never retry. 429 honors at most 60 seconds. Every new `open` can refresh an expired signed URL; never reuse a resolution after `streamExpiresAt` minus 30 seconds.

```java
for (int attempt = 1; attempt <= 3; attempt++) {
  try {
    return api.resolve(trackId, tokenStore.validToken(clock));
  } catch (PlaybackApiException e) {
    if (!e.isNetworkRetryable() || attempt == 3) throw e;
    sleeper.sleepMillis(backoff.withJitter(attempt));
  }
}
throw new IllegalStateException("unreachable");
```

- [ ] **Step 6: Verify and commit**

```bash
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.PlaybackTokenStoreTest' --tests 'com.hymnz.app.playback.PlaybackApiClientTest' --tests 'com.hymnz.app.playback.HymnzResolvingDataSourceTest' assembleDebug
git add android/app/src/main/java/com/hymnz/app/playback/PlaybackTokenStore.java android/app/src/main/java/com/hymnz/app/playback/PlaybackApiClient.java android/app/src/main/java/com/hymnz/app/playback/HymnzResolvingDataSource.java android/app/src/test/java/com/hymnz/app/playback docs/superpowers/plans/2026-08-21-native-playback-04-android-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(android): resolve encrypted playback streams"
```

Set the ledger to `NP-AND-04`.

---

### Task NP-AND-04: Own ExoPlayer state and queue recovery

**Prerequisites:** `NP-AND-02`, `NP-AND-03`.

**Files:**
- Create: `android/app/src/main/java/com/hymnz/app/playback/HymnzPlaybackEngine.java`
- Create: `android/app/src/main/java/com/hymnz/app/playback/NativePlaybackTelemetry.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/HymnzPlaybackEngineTest.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/NativePlaybackTelemetryTest.java`

**Interfaces:**
- Produces engine configure/load/play/pause/seek/next/previous/repeat/shuffle/getState/clear commands returning snapshots through `ListenableFuture`/callback completion.
- Produces snapshot listener registration for service/session events.
- Consumes one ExoPlayer port, queue state, token/state stores, native telemetry client, clock, and resolver factory.
- Consumers: MediaSessionService.

- [ ] **Step 1: Write engine tests with a fake Player port**

Cover queue load without `prepare`, play causing prepare/resolution, actual Player events driving resolving/loading/buffering/playing/paused, completion and queue exhaustion, repeat modes, shuffle, previous threshold, seek clamp, stale async callback cancellation, three network retries, one failed-item skip, five consecutive failed items stopping, auth failure pausing without skip, position update throttling, and one UUID `playback_started` telemetry event per audible queue occurrence.

- [ ] **Step 2: Run red**

```bash
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.HymnzPlaybackEngineTest' --tests 'com.hymnz.app.playback.NativePlaybackTelemetryTest'
```

- [ ] **Step 3: Implement media items and authoritative snapshots**

Each occurrence becomes:

```java
new MediaItem.Builder()
  .setMediaId(item.queueItemId)
  .setUri("hymnz://track/" + Uri.encode(item.trackId))
  .setMediaMetadata(metadataFor(item))
  .build();
```

Set items without preparing on `loadQueue`. Reorder the explicit MediaItem list for shuffle rather than relying on a nonpersisted random Player order. Player listener callbacks update the snapshot sequence; command methods do not claim playing until `Player.STATE_READY && playWhenReady && isPlaying`.

`NativePlaybackTelemetry` accepts only the server event enum and scalar fields, assigns UUIDs, persists at most 50 events as a private atomic file, and posts from the service to `/api/playback/events` with the current bearer token. Retry retains event IDs; success removes accepted events. It never serializes token/URL/message/payload fields and emits `engine_recovered_unclean` when active persisted state lacks a clean-stop marker on process recreation.

- [ ] **Step 4: Persist and prevent duplicate ownership**

The service constructs one engine. Engine `release()` removes listeners, pauses/releases the player, and stops position callbacks. Save state on queue/index/repeat/shuffle and at most every five seconds for position. Restore sets media items/current position with `playWhenReady=false` and does not call prepare.

```java
public void release() {
  if (!released.compareAndSet(false, true)) return;
  positionHandler.removeCallbacks(positionTick);
  player.removeListener(playerListener);
  player.pause();
  player.release();
  snapshotListeners.clear();
}
```

- [ ] **Step 5: Verify and commit**

```bash
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.HymnzPlaybackEngineTest' --tests 'com.hymnz.app.playback.NativePlaybackTelemetryTest' assembleDebug
git add android/app/src/main/java/com/hymnz/app/playback/HymnzPlaybackEngine.java android/app/src/main/java/com/hymnz/app/playback/NativePlaybackTelemetry.java android/app/src/test/java/com/hymnz/app/playback/HymnzPlaybackEngineTest.java android/app/src/test/java/com/hymnz/app/playback/NativePlaybackTelemetryTest.java docs/superpowers/plans/2026-08-21-native-playback-04-android-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(android): own playback with ExoPlayer"
```

Set the ledger to `NP-AND-05`.

---

### Task NP-AND-05: Host playback in MediaSessionService with system metadata/focus

**Prerequisites:** `NP-AND-04`.

**Files:**
- Create: `android/app/src/main/java/com/hymnz/app/playback/PlaybackSessionCommands.java`
- Create: `android/app/src/main/java/com/hymnz/app/playback/HymnzPlaybackService.java`
- Create: `android/app/src/main/java/com/hymnz/app/playback/ArtworkLoader.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/PlaybackSessionCommandsTest.java`
- Create: `android/app/src/test/java/com/hymnz/app/playback/ArtworkLoaderTest.java`
- Create: `android/app/src/androidTest/java/com/hymnz/app/playback/HymnzPlaybackServiceTest.java`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Produces one MediaSession connected to the engine ExoPlayer.
- Produces custom commands `CONFIGURE_SESSION`, `LOAD_QUEUE`, `PLAY`, `PAUSE`, `SEEK`, `NEXT`, `PREVIOUS`, `SET_REPEAT`, `SET_SHUFFLE`, `GET_STATE`, `CLEAR` under prefix `com.hymnz.playback.v1.`.
- Emits session event `com.hymnz.playback.v1.STATE_CHANGED` with snapshot extras.
- Consumers: Capacitor MediaController bridge and Android system.

- [ ] **Step 1: Add manifest permissions/service declaration**

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

Inside `<application>`:

```xml
<service
    android:name=".playback.HymnzPlaybackService"
    android:exported="true"
    android:foregroundServiceType="mediaPlayback">
    <intent-filter>
        <action android:name="androidx.media3.session.MediaSessionService" />
    </intent-filter>
</service>
```

- [ ] **Step 2: Write custom-command contract tests**

Assert exact strings, protocol version, every command returns a snapshot bundle or typed failure, unknown commands return `RESULT_ERROR_NOT_SUPPORTED`, and no extras contain token/signed URL.

In `ArtworkLoaderTest`, inject a fake HTTP/cache port and assert track → collection → brand order, one retry for a transient candidate, immediate fallback for invalid image data, a 50 MB least-recently-used disk bound, and brand bytes returned after all remote failures.

- [ ] **Step 3: Implement service lifecycle**

In `onCreate`, build `ExoPlayer` with resolving data source, audio attributes `C.USAGE_MEDIA`/`C.AUDIO_CONTENT_TYPE_MUSIC`, `setAudioAttributes(attributes, true)`, `setHandleAudioBecomingNoisy(true)`, and `setWakeMode(C.WAKE_MODE_NETWORK)`. Create engine then MediaSession. `onGetSession` returns it. `onDestroy` releases session then engine/player exactly once.

```java
@Override public void onCreate() {
  super.onCreate();
  AudioAttributes attributes = new AudioAttributes.Builder()
      .setUsage(C.USAGE_MEDIA)
      .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
      .build();
  ExoPlayer player = new ExoPlayer.Builder(this)
      .setMediaSourceFactory(mediaSourceFactory())
      .build();
  player.setAudioAttributes(attributes, true);
  player.setHandleAudioBecomingNoisy(true);
  player.setWakeMode(C.WAKE_MODE_NETWORK);
  engine = new HymnzPlaybackEngine(player, dependencies());
  mediaSession = new MediaSession.Builder(this, player).setCallback(callback).build();
}
```

- [ ] **Step 4: Map system Player commands to queue semantics**

MediaSession standard play/pause/seek/next/previous acts on the same ExoPlayer; ExoPlayer’s standard previous behavior uses the 3-second restart threshold covered by the engine test. Use the session callback for custom command dispatch. On each engine snapshot send the session event and ensure current `MediaItem.MediaMetadata` carries title, artist, album title, duration extras, and selected artwork URI.

```java
artworkLoader.load(currentItem.artwork).thenAccept(result -> {
  MediaMetadata metadata = currentMediaItem.mediaMetadata.buildUpon()
      .setArtworkData(result.bytes, MediaMetadata.PICTURE_TYPE_FRONT_COVER)
      .build();
  player.replaceMediaItem(player.getCurrentMediaItemIndex(),
      currentMediaItem.buildUpon().setMediaMetadata(metadata).build());
  telemetry.enqueueArtworkResult(result.role, result.usedFallback);
});
```

- [ ] **Step 5: Test task-removal and notification behavior**

Instrumentation verifies ongoing playback remains after `onTaskRemoved`, paused playback does not restart, clear releases the foreground notification, noisy intent pauses, and notification/system media controls update the same session. On API 33+, verify metadata—not a custom notification layout—drives system UI.

- [ ] **Step 6: Verify manifest/tests/build and commit**

```bash
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.ArtworkLoaderTest' assembleDebug
./android/gradlew -p android connectedDebugAndroidTest
./android/gradlew -p android :app:processDebugMainManifest
git add android/app/src/main/AndroidManifest.xml android/app/src/main/java/com/hymnz/app/playback android/app/src/test/java/com/hymnz/app/playback android/app/src/androidTest/java/com/hymnz/app/playback docs/superpowers/plans/2026-08-21-native-playback-04-android-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(android): host playback in media session service"
```

If no emulator/device is attached, record `connectedDebugAndroidTest` as the only incomplete step and do not check/commit the task until it runs.

Set the ledger to `NP-AND-06`.

---

### Task NP-AND-06: Expose the Capacitor plugin through MediaController

**Prerequisites:** `NP-AND-05`, `NP-WEB-05`.

**Files:**
- Create: `android/app/src/main/java/com/hymnz/app/playback/HymnzPlaybackPlugin.java`
- Create: `android/app/src/androidTest/java/com/hymnz/app/playback/HymnzPlaybackPluginTest.java`
- Modify: `android/app/src/main/java/com/hymnz/app/MainActivity.java`

**Interfaces:**
- Provides Capacitor plugin name exactly `HymnzPlayback` and version 1 methods/event.
- Connects with `MediaController.Builder(context, SessionToken(ComponentName(...))).buildAsync()`.
- Sends every command through the versioned MediaSession custom command and resolves the returned snapshot.

- [ ] **Step 1: Register the local plugin before bridge creation**

Change `MainActivity` to:

```java
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle savedInstanceState) {
    registerPlugin(HymnzPlaybackPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
```

Add required imports only.

- [ ] **Step 2: Write plugin/controller integration tests**

Assert plugin availability, capabilities response, each method’s exact input/output, invalid calls rejected, controller reconnection after Activity/WebView recreation, one state event per service event, and no token in result/event. Destroying the plugin releases its MediaController/listener but does not stop an ongoing service player.

- [ ] **Step 3: Implement bridge methods**

Annotate `@CapacitorPlugin(name = "HymnzPlayback")`. Each `@PluginMethod` waits asynchronously for controller connection, sends one command, validates `SessionResult.RESULT_SUCCESS`, parses the snapshot extras, and resolves. A 10-second bridge timeout rejects with stable code `engine_failed`; it never exposes exception text.

```java
@PluginMethod
public void play(PluginCall call) {
  ListenableFuture<SessionResult> timed = Futures.withTimeout(
      sendCommand(PlaybackSessionCommands.PLAY, Bundle.EMPTY),
      10, TimeUnit.SECONDS, timeoutExecutor);
  Futures.addCallback(timed, new FutureCallback<>() {
    @Override public void onSuccess(SessionResult result) {
      if (result.resultCode != SessionResult.RESULT_SUCCESS) {
        call.reject("engine_failed", "engine_failed");
      } else {
        call.resolve(PlaybackModels.snapshotFrom(result.extras).toJSObject());
      }
    }
    @Override public void onFailure(Throwable ignored) {
      call.reject("engine_failed", "engine_failed");
    }
  }, ContextCompat.getMainExecutor(getContext()));
}
```

- [ ] **Step 4: Verify Capacitor discovery and service retention**

```bash
npm run cap:sync:android
./android/gradlew -p android testDebugUnitTest connectedDebugAndroidTest assembleDebug
```

On emulator, verify `Capacitor.isPluginAvailable("HymnzPlayback")`, protocol 1 capabilities, start playback, destroy/recreate MainActivity, and `getState()` returns the continuing service snapshot.

- [ ] **Step 5: Commit bridge**

```bash
git add android/app/src/main/java/com/hymnz/app/MainActivity.java android/app/src/main/java/com/hymnz/app/playback/HymnzPlaybackPlugin.java android/app/src/androidTest/java/com/hymnz/app/playback/HymnzPlaybackPluginTest.java android/capacitor.settings.gradle android/app/capacitor.build.gradle docs/superpowers/plans/2026-08-21-native-playback-04-android-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(android): expose native playback bridge"
```

Set the ledger to `NP-AND-07`.

---

### Task NP-AND-07: Complete Android internal device gate

**Prerequisites:** `NP-AND-06`.

**Files:**
- Create: `docs/release/native-playback/android-internal-test.md`
- Modify: `docs/superpowers/plans/2026-08-21-native-playback-roadmap.md`
- Modify: `docs/superpowers/plans/2026-08-21-native-playback-status.md`

**Interfaces:**
- Produces signed evidence that the Android half of Gate C passes with native playback enabled only for test installations.

- [ ] **Step 1: Run clean automated/release gate**

```bash
npm run cap:sync:android
./android/gradlew -p android clean testDebugUnitTest connectedDebugAndroidTest assembleDebug bundleRelease
```

Record test count, failures, APK/AAB paths, commit SHA, Gradle/AGP/Media3 versions, emulator/device API levels, and manifest permissions/service in `android-internal-test.md`.

- [ ] **Step 2: Enable only physical test installations**

Use non-production/internal settings with enabled true, rollout 100, and the minimum Android version set to the internal build. Production remains enabled false with rollout zero.

- [ ] **Step 3: Execute physical-device smoke matrix**

On a representative API 24/25 device or lab equivalent plus a current Android device, record: queue commands, 3-second previous, repeat/shuffle, screen off, app switch, task removal, WebView recreation, system/notification controls, wired/Bluetooth buttons, noisy disconnect pause, call/Assistant/alarm/audio focus, Wi-Fi/cellular, Doze, offline/retry, expired URL, visitor/free/paid, corrupt/missing artwork, and cold restore paused.

- [ ] **Step 4: Run Android soak gates**

Complete 20 consecutive locked-screen tracks and a separate 60-minute background/Doze session. Record timestamps, device/API, account tier, queue, transitions, failures, foreground-service/notification state, and telemetry session ID. Any unexpected stop leaves this task unchecked.

- [ ] **Step 5: Commit evidence**

Mark Android and overall Gate C complete, set the ledger to `NP-REL-01`, then:

```bash
git add docs/release/native-playback/android-internal-test.md docs/superpowers/plans/2026-08-21-native-playback-04-android-engine.md docs/superpowers/plans/2026-08-21-native-playback-roadmap.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "test(android): complete native playback internal gate"
```
