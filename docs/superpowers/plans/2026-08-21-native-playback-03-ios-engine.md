# Native Playback iOS Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement protocol version 1 as an iOS-native AVPlayer music session that continues with the screen locked, advances queues without JavaScript, publishes accurate Now Playing state/artwork, handles system controls and interruptions, and restores paused state.

**Architecture:** Focused Swift value types and a pure queue state machine sit beneath an injected API client, persistence/token stores, artwork loader, system-session coordinator, and one `AVPlayer` engine. `HymnzPlaybackPlugin` translates Capacitor calls into serialized engine commands and emits validated snapshots. The engine owns sequence numbers and media state; the plugin never duplicates queue behavior.

**Tech Stack:** iOS 16+, Swift 5, XCTest, Capacitor 8, AVFoundation, MediaPlayer, UIKit, URLSession, Keychain Services.

**Spec:** `docs/superpowers/specs/2026-08-21-native-playback-ownership-design.md`

## Global Constraints

- iOS deployment target remains `16.0` and the app bundle remains `com.hymnz.app`.
- Add every Swift file to the Xcode `App` target; adding a file on disk alone does not compile it in the current explicit PBX project.
- Use one `AVPlayer` and one `IOSPlaybackEngine`; initialization releases any previous observer/player ownership.
- Configure `AVAudioSession` category `.playback` without `.mixWithOthers`; activate only when playback is requested.
- Add `audio` to `UIBackgroundModes` while retaining `remote-notification`.
- Native owns queue advancement, repeat, shuffle, retry, position, interruption state, and system metadata while the WebView is suspended.
- Resolve only the current item and optionally the immediately upcoming item; never pre-mint a whole queue.
- Store the playback token only in Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
- Persist only the approved resumable queue fields; restore as paused and never autoplay after cold launch.
- Previous restarts after 3 seconds; otherwise moves to the previous queue item.
- Headphone/Bluetooth old-device-unavailable route change pauses.
- Interruption resumes only when `.shouldResume` is present and the engine was playing before interruption.
- Now Playing metadata includes title, artist, album, duration, elapsed time, rate, queue count/index, and fallback artwork.
- Emit position snapshots no more than four times/second foreground and once/second background.
- Do not log tokens, signed URLs, cookies, request authorization, or raw server response bodies.

## Official implementation references

- Apple’s [media playback configuration guide](https://developer.apple.com/documentation/AVFoundation/configuring-your-app-for-media-playback) requires the playback audio-session category and Audio background mode for lock-screen/background continuation.
- Apple’s [`AVAudioSession.Category.playback`](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playback) documents lock-screen behavior and the `audio` background-mode requirement.
- Apple’s [`MPNowPlayingInfoCenter`](https://developer.apple.com/documentation/mediaplayer/mpnowplayinginfocenter) is the source for lock-screen/Control Center metadata and queue fields.

## File map

- Modify `ios/App/App.xcodeproj/project.pbxproj` — add Swift sources and `AppTests` unit-test target.
- Create `ios/App/AppTests/` — XCTest target and all native unit tests.
- Create `ios/App/App/Playback/HymnzPlaybackModels.swift` — exact Codable protocol models.
- Create `ios/App/App/Playback/PlaybackQueueState.swift` — pure canonical/shuffled queue rules.
- Create `ios/App/App/Playback/PlaybackStateStore.swift` — atomic paused-state persistence.
- Create `ios/App/App/Playback/PlaybackTokenStore.swift` — Keychain-only token storage.
- Create `ios/App/App/Playback/PlaybackAPIClient.swift` — resolver transport and typed failures.
- Create `ios/App/App/Playback/ArtworkLoader.swift` — ordered retry/fallback cache.
- Create `ios/App/App/Playback/NowPlayingCoordinator.swift` — metadata and remote commands.
- Create `ios/App/App/Playback/AudioSessionCoordinator.swift` — category, interruptions, routes.
- Create `ios/App/App/Playback/IOSPlaybackEngine.swift` — serialized AVPlayer owner.
- Create `ios/App/App/Playback/NativePlaybackTelemetry.swift` — durable allowlisted background event batches.
- Create `ios/App/App/Playback/HymnzPlaybackPlugin.swift` — Capacitor protocol bridge.
- Modify `ios/App/App/Info.plist` — add `audio` background mode.
- Modify `ios/App/App/AppDelegate.swift` only if needed to initialize the engine before plugin load; keep Firebase setup unchanged.
- Create `docs/release/native-playback/ios-internal-test.md` — build and physical-device evidence.

---

### Task NP-IOS-01: Add the XCTest target and exact protocol models

**Prerequisites:** `NP-WEB-01`, server resolver available in a test environment.

**Files:**
- Modify: `ios/App/App.xcodeproj/project.pbxproj`
- Create: `ios/App/AppTests/PlaybackModelsTests.swift`
- Create: `ios/App/App/Playback/HymnzPlaybackModels.swift`

**Interfaces:**
- Produces: `PlaybackCapabilities`, `ConfigurePlaybackSession`, `PlaybackQueueItem`, `ArtworkCandidate`, `LoadQueueInput`, `PlaybackFailure`, and `PlaybackSnapshot` as `Codable`, `Equatable`, `Sendable` Swift types.
- Produces: `PlaybackSnapshot.capacitorObject() throws -> [String: Any]`.
- Consumers: Every later iOS task and the plugin.

- [ ] **Step 1: Add an `AppTests` unit-test target in Xcode**

Open `ios/App/App.xcworkspace`, add an iOS Unit Testing Bundle named `AppTests`, set Host Application to `App`, deployment target 16.0, Swift 5, and add the shared playback model/state files to both App and AppTests targets. Ensure the shared `App` scheme has Test action `AppTests` enabled. Review the resulting `project.pbxproj` diff before proceeding.

```bash
xcodebuild -list -workspace ios/App/App.xcworkspace
git diff -- ios/App/App.xcodeproj/project.pbxproj
```

- [ ] **Step 2: Write a round-trip model test**

```swift
func testSnapshotRoundTripsProtocolVersionOne() throws {
    let snapshot = PlaybackSnapshot(
        protocolVersion: 1, sessionId: "ios-session", sequence: 4,
        queueRevision: "queue-1", status: .playing, queueIndex: 0,
        queueLength: 1, trackId: "sands-01", positionSeconds: 12,
        durationSeconds: 240, bufferedSeconds: 30, repeatMode: .off,
        shuffle: false, reason: .userCommand, error: nil
    )
    let data = try JSONEncoder().encode(snapshot)
    XCTAssertEqual(try JSONDecoder().decode(PlaybackSnapshot.self, from: data), snapshot)
    XCTAssertEqual(try snapshot.capacitorObject()["protocolVersion"] as? Int, 1)
}
```

Add a JSON fixture matching the TypeScript snapshot and assert exact camelCase keys and raw enum strings.

- [ ] **Step 3: Run red**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/PlaybackModelsTests CODE_SIGNING_ALLOWED=NO
```

Expected: FAIL because Swift playback models do not exist. If that simulator is unavailable, select an available iOS 26 simulator with `xcrun simctl list devices available`, record the exact destination in the status ledger, and reuse it for every later iOS command.

- [ ] **Step 4: Implement exact models without alternate JSON names**

Use raw-string enums whose values match `src/lib/playback/types.ts`. Reject protocol versions other than 1 in custom decoding. The Swift property may be named `repeatMode`, but its `CodingKeys` case must be `case repeatMode = "repeat"`; every encoded wire key remains identical to TypeScript. `queueIndex` is `0` for an empty/idle snapshot only when `queueLength == 0`; otherwise enforce `0..<queueLength`. Numeric time fields are finite and nonnegative.

```swift
enum CodingKeys: String, CodingKey {
    case protocolVersion, sessionId, sequence, queueRevision, status
    case queueIndex, queueLength, trackId, positionSeconds, durationSeconds
    case bufferedSeconds, shuffle, reason, error
    case repeatMode = "repeat"
}
```

- [ ] **Step 5: Run green and build App**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/PlaybackModelsTests CODE_SIGNING_ALLOWED=NO
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

Expected: model tests and App build PASS.

- [ ] **Step 6: Commit iOS protocol scaffold**

Update the ledger to `NP-IOS-02`, then:

```bash
git add ios/App/App.xcodeproj/project.pbxproj ios/App/App/Playback/HymnzPlaybackModels.swift ios/App/AppTests/PlaybackModelsTests.swift docs/superpowers/plans/2026-08-21-native-playback-03-ios-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(ios): add playback protocol models"
```

---

### Task NP-IOS-02: Implement deterministic queue state and paused persistence

**Prerequisites:** `NP-IOS-01`.

**Files:**
- Create: `ios/App/App/Playback/PlaybackQueueState.swift`
- Create: `ios/App/App/Playback/PlaybackStateStore.swift`
- Create: `ios/App/AppTests/PlaybackQueueStateTests.swift`
- Create: `ios/App/AppTests/PlaybackStateStoreTests.swift`

**Interfaces:**
- Produces: `PlaybackQueueState.load(_:)`, `next(reason:)`, `previous(positionSeconds:)`, `setRepeat(_:)`, `setShuffle(_:seed:)`, and read-only current item/index/order.
- Produces: `PlaybackStateStore.save(_:)`, `restore(maxAge:)`, and `clear()`.
- Consumers: `IOSPlaybackEngine`.

- [ ] **Step 1: Write the queue behavior suite**

Cover duplicate tracks by `queueItemId`, repeat off/all/one, one-item queue, stable seeded shuffle visiting every occurrence exactly once, disabling shuffle while preserving current occurrence, previous at 2.99/3.01 seconds, and failed-item skip only after the caller says retries are exhausted.

```swift
func testPreviousRestartsAfterThreeSeconds() throws {
    var state = try loadedQueue(startIndex: 2)
    XCTAssertEqual(state.previous(positionSeconds: 3.01), .seekCurrentToZero)
    XCTAssertEqual(state.currentIndex, 2)
    XCTAssertEqual(state.previous(positionSeconds: 2.99), .load(index: 1))
}
```

- [ ] **Step 2: Write persistence tests**

Use an injected temporary file URL. Assert canonical/shuffled order, index, position, repeat, shuffle, metadata revision, active-before-termination flag, and timestamp round-trip. Restore always returns `shouldAutoplay == false`; corrupt or older-than-seven-days state returns nil and is deleted.

- [ ] **Step 3: Run red**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/PlaybackQueueStateTests -only-testing:AppTests/PlaybackStateStoreTests CODE_SIGNING_ALLOWED=NO
```

- [ ] **Step 4: Implement pure queue and atomic storage**

The queue state mutates synchronously on its owning actor/serial executor and contains no AVFoundation types. Persistence encodes to a temporary file with complete file protection, then atomically replaces `Library/Application Support/HymnzPlayback/state-v1.json`. Save on track/index/repeat/shuffle changes and at most every five seconds for position.

```swift
struct PersistedPlaybackState: Codable, Equatable {
    let version: Int
    let canonicalOrder: [String]
    let shuffledOrder: [String]
    let queueIndex: Int
    let positionSeconds: Double
    let repeatMode: RepeatMode
    let shuffle: Bool
    let wasActive: Bool
    let savedAt: Date
}

func save(_ state: PersistedPlaybackState) throws {
    let data = try encoder.encode(state)
    try data.write(to: temporaryURL, options: [.atomic, .completeFileProtection])
    try fileManager.replaceItemAt(stateURL, withItemAt: temporaryURL)
}
```

- [ ] **Step 5: Verify and commit**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/PlaybackQueueStateTests -only-testing:AppTests/PlaybackStateStoreTests CODE_SIGNING_ALLOWED=NO
git add ios/App/App/Playback/PlaybackQueueState.swift ios/App/App/Playback/PlaybackStateStore.swift ios/App/AppTests/PlaybackQueueStateTests.swift ios/App/AppTests/PlaybackStateStoreTests.swift ios/App/App.xcodeproj/project.pbxproj docs/superpowers/plans/2026-08-21-native-playback-03-ios-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(ios): persist deterministic playback queues"
```

Set the ledger to `NP-IOS-03`.

---

### Task NP-IOS-03: Store scoped credentials and resolve tracks natively

**Prerequisites:** `NP-SRV-04`, `NP-IOS-01`.

**Files:**
- Create: `ios/App/App/Playback/PlaybackTokenStore.swift`
- Create: `ios/App/App/Playback/PlaybackAPIClient.swift`
- Create: `ios/App/AppTests/PlaybackTokenStoreTests.swift`
- Create: `ios/App/AppTests/PlaybackAPIClientTests.swift`

**Interfaces:**
- Produces: `PlaybackTokenStore.set(token:expiresAt:)`, `validToken(now:)`, and `clear()`.
- Produces: `PlaybackAPIClient.resolve(trackID:token:) async throws -> PlaybackResolution`.
- Produces: typed `PlaybackAPIError.authenticationRequired`, `.entitlementDenied`, `.unavailable`, `.rateLimited(seconds)`, `.offline`, `.timeout`, `.server`.
- Consumers: `IOSPlaybackEngine` and plugin `configureSession`.

- [ ] **Step 1: Write Keychain tests through an injected storage port**

The test fake records service `com.hymnz.app.playback`, account `session-v1`, accessibility `afterFirstUnlockThisDeviceOnly`, and raw data. Assert expired reads clear storage, null configure clears, and no value is written to UserDefaults or playback persistence.

- [ ] **Step 2: Write URLProtocol API tests**

Assert exact POST URL `https://www.hymnz.com/api/playback/resolve`, JSON `{ "trackId": "sands-01" }`, `Content-Type: application/json`, optional bearer header, 15-second request timeout, response decoding, and HTTP mapping for 401/403/404/429/500. Ensure error descriptions contain codes but not response bodies or authorization.

- [ ] **Step 3: Run red and implement**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/PlaybackTokenStoreTests -only-testing:AppTests/PlaybackAPIClientTests CODE_SIGNING_ALLOWED=NO
```

Use Keychain Security APIs directly and an injected `URLSession`. Decoder uses ISO-8601 dates only to validate expiration; it retains wire strings for exact bridge snapshots.

- [ ] **Step 4: Add bounded retry helper tests**

Test delays with an injected sleeper: timeout/offline delays approximately 0.5s, 1s, 2s plus bounded jitter and stops after three attempts; 401 and 404 never retry; 403 stream expiry permits exactly one fresh resolution at playback layer; 429 honors server seconds up to 60.

```swift
func testAuthenticationDoesNotRetry() async {
    api.results = [.failure(.authenticationRequired)]
    await XCTAssertThrowsErrorAsync(try await retryPolicy.run { try await api.resolve() })
    XCTAssertEqual(api.callCount, 1)
    XCTAssertEqual(sleeper.delays, [])
}
```

- [ ] **Step 5: Verify and commit**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/PlaybackTokenStoreTests -only-testing:AppTests/PlaybackAPIClientTests CODE_SIGNING_ALLOWED=NO
git add ios/App/App/Playback/PlaybackTokenStore.swift ios/App/App/Playback/PlaybackAPIClient.swift ios/App/AppTests/PlaybackTokenStoreTests.swift ios/App/AppTests/PlaybackAPIClientTests.swift ios/App/App.xcodeproj/project.pbxproj docs/superpowers/plans/2026-08-21-native-playback-03-ios-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(ios): resolve playback with scoped credentials"
```

Set the ledger to `NP-IOS-04`.

---

### Task NP-IOS-04: Own AVPlayer state, queue advancement, and recovery

**Prerequisites:** `NP-IOS-02`, `NP-IOS-03`.

**Files:**
- Create: `ios/App/App/Playback/IOSPlaybackEngine.swift`
- Create: `ios/App/App/Playback/NativePlaybackTelemetry.swift`
- Create: `ios/App/AppTests/IOSPlaybackEngineTests.swift`
- Create: `ios/App/AppTests/NativePlaybackTelemetryTests.swift`

**Interfaces:**
- Produces: one serialized `IOSPlaybackEngine` implementing configure/load/play/pause/seek/next/previous/repeat/shuffle/getState/clear.
- Produces: snapshot observer registration with immediately emitted current state.
- Consumes: queue state, token store, API client, state store, native telemetry client, injected player factory, and clock.
- Consumers: audio/system coordinator and Capacitor plugin.

- [ ] **Step 1: Write engine tests with a `PlayerPort` fake**

Cover load without resolution/consumption, play resolving only current item, status sequence `resolving → loading → playing`, native item completion advancing while no JS listener is attached, repeat one seeking zero, queue exhaustion ending paused, position clamp, stale async resolution cancellation after next/clear, three retries then one skip, five consecutive failed items pausing with a non-recoverable failure, and one UUID `playback_started` telemetry event per audible queue occurrence.

- [ ] **Step 2: Run red**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/IOSPlaybackEngineTests -only-testing:AppTests/NativePlaybackTelemetryTests CODE_SIGNING_ALLOWED=NO
```

- [ ] **Step 3: Implement engine serialization and AVPlayer adapter**

Use `@MainActor` for AVPlayer/Now Playing mutations and a monotonically increasing `UInt64` sequence converted safely to JavaScript number range. Each async resolve captures `(sessionId, queueRevision, queueItemId)` and discards its result if any changes. Observe `.AVPlayerItemDidPlayToEndTime`, item status, `timeControlStatus`, timed position, and access/error logs with removable observer tokens.

`NativePlaybackTelemetry` accepts only the server event enum and scalar fields, assigns a UUID, writes a maximum 50-event queue atomically under Application Support, and posts batches to `/api/playback/events` with the current bearer token. It retries transport failures without changing event IDs, deletes accepted events, never serializes token/URL/message/payload fields, and emits `engine_recovered_unclean` on next launch when persisted state says playback was active without a clean-stop marker.

```swift
@MainActor
final class IOSPlaybackEngine {
    private var player: PlayerPort
    private var queue: PlaybackQueueState
    private var snapshot: PlaybackSnapshot

    func play() async -> PlaybackSnapshot {
        let identity = queue.currentIdentity
        emit(status: .resolving, reason: .userCommand)
        let resolution = try? await resolver.resolve(trackID: identity.trackId)
        guard queue.currentIdentity == identity, let resolution else { return snapshot }
        await replaceAndPlay(resolution, identity: identity)
        return snapshot
    }
}
```

- [ ] **Step 4: Implement resolution expiry recovery**

On item HTTP/AV error corresponding to expired/forbidden stream, cancel the failed item, resolve once again, replace current item at the confirmed position, and resume only if it had been playing. Authentication required pauses and clears Keychain token without skipping. Nonretryable unavailable follows failed-item policy and emits the failure before advancing.

```swift
private func recoverExpiredStream(position: Double, wasPlaying: Bool) async {
    guard streamRefreshAttempts == 0 else { return await failCurrent(.streamExpired) }
    streamRefreshAttempts = 1
    do {
        let refreshed = try await resolver.resolve(trackID: queue.current.trackId)
        try await replaceItem(refreshed, position: position)
        if wasPlaying { player.play() }
    } catch PlaybackAPIError.authenticationRequired {
        tokenStore.clear()
        pauseWithFailure(.authenticationRequired)
    } catch {
        await failCurrent(.streamExpired)
    }
}
```

- [ ] **Step 5: Enforce duplicate-player cleanup**

`IOSPlaybackEngine.shared` is the only production instance. `initialize()` removes every prior KVO/notification/time observer and pauses/releases the prior AVPlayer before creating the new adapter. `clear()` pauses, replaces current item with nil, clears Now Playing through its injected port, resets persistence, and increments to an idle snapshot.

- [ ] **Step 6: Verify and commit**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/IOSPlaybackEngineTests -only-testing:AppTests/NativePlaybackTelemetryTests CODE_SIGNING_ALLOWED=NO
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
git add ios/App/App/Playback/IOSPlaybackEngine.swift ios/App/App/Playback/NativePlaybackTelemetry.swift ios/App/AppTests/IOSPlaybackEngineTests.swift ios/App/AppTests/NativePlaybackTelemetryTests.swift ios/App/App.xcodeproj/project.pbxproj docs/superpowers/plans/2026-08-21-native-playback-03-ios-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(ios): own playback with AVPlayer"
```

Set the ledger to `NP-IOS-05`.

---

### Task NP-IOS-05: Integrate audio session, interruptions, routes, Now Playing, and artwork

**Prerequisites:** `NP-IOS-04`, `NP-SRV-05`.

**Files:**
- Create: `ios/App/App/Playback/AudioSessionCoordinator.swift`
- Create: `ios/App/App/Playback/ArtworkLoader.swift`
- Create: `ios/App/App/Playback/NowPlayingCoordinator.swift`
- Create: `ios/App/AppTests/AudioSessionCoordinatorTests.swift`
- Create: `ios/App/AppTests/ArtworkLoaderTests.swift`
- Create: `ios/App/AppTests/NowPlayingCoordinatorTests.swift`
- Modify: `ios/App/App/Info.plist`

**Interfaces:**
- Produces: `AudioSessionCoordinator.activateForPlayback()`, `deactivateIfIdle()`, and event callbacks.
- Produces: `ArtworkLoader.load(candidates:) async -> ArtworkResult` with selected role/failure diagnostic.
- Produces: `NowPlayingCoordinator.update(snapshot:item:artwork:)`, `installCommands(engine:)`, and `clear()`.
- Consumers: `IOSPlaybackEngine` and plugin load lifecycle.

- [ ] **Step 1: Write audio interruption/route tests**

Inject notification payload parsing. Began → interrupted snapshot and pause. Ended with `.shouldResume` + previously playing → play; without either condition → paused. Route reason `.oldDeviceUnavailable` pauses; category/route configuration change does not.

- [ ] **Step 2: Write artwork and Now Playing tests**

Artwork tries track → collection → brand, retries a transient candidate once, rejects non-image/oversized data, caches by URL with a 50 MB disk limit, and always returns brand unless the bundled asset itself is corrupt. Now Playing dictionary asserts exact title/artist/album/duration/elapsed/rate/queue count/index and updates elapsed after seek without resetting artwork.

- [ ] **Step 3: Run red and implement coordinators**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/AudioSessionCoordinatorTests -only-testing:AppTests/ArtworkLoaderTests -only-testing:AppTests/NowPlayingCoordinatorTests CODE_SIGNING_ALLOWED=NO
```

Configure `AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)` and `setActive(true)` only on play. Remote command targets call engine methods and return `.success` only after a successful command result; enable play, pause, toggle, next, previous, and change-playback-position.

- [ ] **Step 4: Enable background audio**

Change `Info.plist` to:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
  <string>remote-notification</string>
</array>
```

Do not remove Firebase notification behavior.

- [ ] **Step 5: Verify and commit system integration**

```bash
plutil -lint ios/App/App/Info.plist
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/AudioSessionCoordinatorTests -only-testing:AppTests/ArtworkLoaderTests -only-testing:AppTests/NowPlayingCoordinatorTests CODE_SIGNING_ALLOWED=NO
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
git add ios/App/App/Info.plist ios/App/App/Playback ios/App/AppTests ios/App/App.xcodeproj/project.pbxproj docs/superpowers/plans/2026-08-21-native-playback-03-ios-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(ios): integrate background audio and Now Playing"
```

Set the ledger to `NP-IOS-06`.

---

### Task NP-IOS-06: Expose the Capacitor plugin and restore paused state

**Prerequisites:** `NP-IOS-05`, `NP-WEB-05`.

**Files:**
- Create: `ios/App/App/Playback/HymnzPlaybackPlugin.swift`
- Create: `ios/App/AppTests/HymnzPlaybackPluginTests.swift`
- Modify: `ios/App/App.xcodeproj/project.pbxproj`
- Modify: `ios/App/App/AppDelegate.swift` only if plugin discovery requires explicit registration in the installed Capacitor 8 build.

**Interfaces:**
- Provides plugin name exactly `HymnzPlayback` and the exact version 1 methods/events from `HymnzPlaybackPlugin` TypeScript.
- Emits event exactly `playbackStateChanged` with one snapshot object.
- `getCapabilities` returns iOS/background/system-controls true and protocol 1.

- [ ] **Step 1: Write bridge serialization tests**

Call every plugin method through an injected fake engine and assert input names, missing/invalid input rejection, returned dictionary, listener event name, and one engine invocation. Verify a token never appears in resolved data or `notifyListeners` payload.

- [ ] **Step 2: Run red and implement `CAPBridgedPlugin`**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/HymnzPlaybackPluginTests CODE_SIGNING_ALLOWED=NO
```

Declare exact methods:

```swift
public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "configureSession", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "loadQueue", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "next", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "previous", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "setRepeat", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "setShuffle", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
]
```

- [ ] **Step 3: Restore persisted state on plugin load**

On `load()`, initialize the singleton once, restore state as paused, publish Now Playing rate 0 only after React calls `getState`, and never call play. If another plugin instance loads after WebView recreation, it attaches to the same engine and receives current state rather than creating another player.

- [ ] **Step 4: Verify discovery in a real bridge build**

```bash
npm run cap:sync:ios
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

Launch the simulator, inspect Web Inspector once, and record that `Capacitor.isPluginAvailable("HymnzPlayback")` is true and `getCapabilities()` returns protocol 1. If false, register the plugin instance in the bridge controller using the Capacitor 8 API proven by the installed framework; do not add speculative AppDelegate hooks.

- [ ] **Step 5: Run all iOS tests and commit bridge**

```bash
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO
git add ios/App docs/superpowers/plans/2026-08-21-native-playback-03-ios-engine.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(ios): expose native playback bridge"
```

Set the ledger to `NP-IOS-07`.

---

### Task NP-IOS-07: Complete iOS internal device gate

**Prerequisites:** `NP-IOS-06`.

**Files:**
- Create: `docs/release/native-playback/ios-internal-test.md`
- Modify: `docs/superpowers/plans/2026-08-21-native-playback-roadmap.md`
- Modify: `docs/superpowers/plans/2026-08-21-native-playback-status.md`

**Interfaces:**
- Produces: signed evidence that the iOS half of Gate C passes with native playback enabled only for the test installation.

- [ ] **Step 1: Run clean automated gate**

```bash
npm run cap:sync:ios
xcodebuild clean test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release -sdk iphoneos -archivePath /tmp/HymnzNativePlayback.xcarchive CODE_SIGNING_ALLOWED=NO archive
```

Record test count, failures, archive result, commit SHA, Xcode/iOS versions, and exact simulator in `ios-internal-test.md`.

- [ ] **Step 2: Enable only one physical test installation**

In the non-production/internal settings environment, set enabled true, rollout 100, and minimum iOS version to the local test build version. Production settings remain enabled false and rollout zero.

- [ ] **Step 3: Execute physical-device smoke matrix**

On the oldest supported physical iPhone and a current iPhone, record pass/fail for: play/pause/seek, 3-second previous, next, repeat modes, stable shuffle, lock screen, app switch, WebView detach/return reconciliation, Control Center, wired/Bluetooth buttons, unplug pause, call/Siri interruption, Wi-Fi/cellular transition, offline/retry, expired URL, visitor/free/paid, corrupt/missing artwork, and cold restore paused.

- [ ] **Step 4: Run the iOS soak gates**

Complete 20 consecutive tracks while locked and a separate 60-minute background session. Record timestamps, device/OS, account tier, queue, transition count, failures, and telemetry session ID. Any unexpected stop leaves this task unchecked.

- [ ] **Step 5: Commit evidence**

Mark the iOS platform portion of Gate C complete, set the ledger to `NP-AND-01` for solo execution or `NP-REL-01` if Android is already complete, then:

```bash
git add docs/release/native-playback/ios-internal-test.md docs/superpowers/plans/2026-08-21-native-playback-03-ios-engine.md docs/superpowers/plans/2026-08-21-native-playback-roadmap.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "test(ios): complete native playback internal gate"
```
