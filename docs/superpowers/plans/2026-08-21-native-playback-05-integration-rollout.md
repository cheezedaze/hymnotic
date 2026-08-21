# Native Playback Integration and Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the shared/server/iOS/Android implementations behave as one product, package all pending mobile changes into one store release, and activate native playback gradually with measurable rollback gates.

**Architecture:** Canonical JSON fixtures and a single device/account matrix validate the contract across three languages. Production server/web changes deploy first with native disabled, then one iOS/Android release carries the engines and other already-planned native changes. Runtime activation is independent from store rollout, allowing cohorts of 5%, 25%, 50%, and 100% and an immediate kill switch without interrupting an already-playing track.

**Tech Stack:** Vitest, XCTest/xcodebuild, JUnit/Gradle, Next.js production build, App Store Connect/TestFlight, Google Play internal/production tracks, Vercel/PostgreSQL, playback telemetry.

**Spec:** `docs/superpowers/specs/2026-08-21-native-playback-ownership-design.md`

## Global Constraints

- Do not submit or activate native playback until Gate A, Gate B, and both halves of Gate C are documented as passing.
- Production native settings remain disabled during server/web deploy and store review.
- One store release includes native playback plus the owner’s other pending iOS/Google Play changes after they are inventoried and regression-tested.
- Marketing version is `1.1.0`; iOS build number and Android version code are each one greater than the highest number already uploaded to their store, never merely one greater than the repository value.
- Older binaries must continue playing through the remote website and web adapter.
- Never hand a currently playing session from native to web mid-track for a normal kill switch; apply fallback after pause/end.
- Rollout assignment remains stable per installation.
- Any confirmed access-policy mismatch, token/URL leak, background crash loop, or audio starting without user action immediately halts rollout and sets native enabled false.
- Rollout observation requires at least 48 hours and 25 production playback starts at each cohort before advancing.
- Advance only when crash-free listening sessions are at least 99%, successful starts at least 97%, unexpected stops at most 2% and no worse than 1.5× the web baseline, background continuation at least 95%, and blank-artwork outcome is zero.
- Retain the web fallback and server legacy audio route for at least one full native release cycle after 100% activation.
- Store credentials, production migrations, production flags, and submissions are external state changes; confirm the target/environment immediately before executing each one.

## File map

- Create `test-fixtures/playback/protocol-v1/` — canonical capabilities, queue, snapshots, resolution, and error JSON.
- Modify TypeScript/iOS/Android tests — decode the same fixtures.
- Create `docs/release/native-playback/security-review.md` — token/URL/redaction audit.
- Create `docs/release/native-playback/pending-mobile-changes.md` — inventory of all non-playback changes included in release.
- Create `docs/release/native-playback/test-matrix.md` — consolidated devices/accounts/scenarios/evidence.
- Create `docs/release/native-playback/rollout-runbook.md` — flags, metrics, thresholds, kill switch, rollback.
- Create `docs/release/native-playback/store-submission.md` — versions, artifacts, review notes, release notes.
- Create `docs/release/native-playback/support-triage.md` — user report checklist and fallback response.
- Modify `ios/App/App.xcodeproj/project.pbxproj` — marketing/build number after store check.
- Modify `android/app/build.gradle` — version name/code after store check.
- Modify `docs/superpowers/plans/2026-08-21-native-playback-status.md` every rollout step.

---

### Task NP-REL-01: Prove one protocol across TypeScript, Swift, and Java

**Prerequisites:** `NP-WEB-07`, `NP-IOS-06`, `NP-AND-06`.

**Files:**
- Create: `test-fixtures/playback/protocol-v1/capabilities-ios.json`
- Create: `test-fixtures/playback/protocol-v1/load-queue.json`
- Create: `test-fixtures/playback/protocol-v1/snapshot-playing.json`
- Create: `test-fixtures/playback/protocol-v1/snapshot-failed.json`
- Create: `test-fixtures/playback/protocol-v1/resolution-preview.json`
- Modify: `src/lib/playback/protocol.test.ts`
- Modify: `ios/App/AppTests/PlaybackModelsTests.swift`
- Modify: `android/app/src/test/java/com/hymnz/app/playback/PlaybackModelsTest.java`

**Interfaces:**
- Produces: Canonical wire fixtures decoded and re-encoded equivalently by all three implementations.
- Consumers: Release candidates and future protocol version changes.

- [ ] **Step 1: Create literal canonical fixtures**

`load-queue.json` includes two occurrences of `sands-01` with distinct IDs, track/collection/brand artwork, start index 1, repeat all, shuffle true. `snapshot-failed.json` includes every nullable failure field with `network_timeout`, recoverable true, attempt 3, and retry 2 seconds. Fixtures contain no production user ID, token, signed URL, cookie, or secret.

```json
{
  "items": [
    {
      "queueItemId": "fixture:0:sands-01",
      "trackId": "sands-01",
      "title": "Sands of the Sea",
      "artist": "HYMNZ",
      "collectionId": "sands-of-the-sea",
      "collectionTitle": "Sands of the Sea",
      "durationSeconds": 240,
      "artwork": [
        {
          "url": "https://cdn.example.test/sands-01-1024.jpg",
          "mimeType": "image/jpeg",
          "width": 1024,
          "height": 1024,
          "role": "track"
        },
        {
          "url": "https://www.hymnz.com/images/playback-brand-1024.jpg",
          "mimeType": "image/jpeg",
          "width": 1024,
          "height": 1024,
          "role": "brand"
        }
      ]
    },
    {
      "queueItemId": "fixture:1:sands-01",
      "trackId": "sands-01",
      "title": "Sands of the Sea",
      "artist": "HYMNZ",
      "collectionId": "sands-of-the-sea",
      "collectionTitle": "Sands of the Sea",
      "durationSeconds": 240,
      "artwork": [
        {
          "url": "https://cdn.example.test/sands-collection-1024.jpg",
          "mimeType": "image/jpeg",
          "width": 1024,
          "height": 1024,
          "role": "collection"
        },
        {
          "url": "https://www.hymnz.com/images/playback-brand-1024.jpg",
          "mimeType": "image/jpeg",
          "width": 1024,
          "height": 1024,
          "role": "brand"
        }
      ]
    }
  ],
  "startIndex": 1,
  "repeat": "all",
  "shuffle": true
}
```

- [ ] **Step 2: Add TypeScript fixture tests**

Read each fixture, validate with the production parser, assert exact values, stringify the parsed result, and validate again. Verify one mutated protocol 2 copy is rejected.

```ts
const fixture = JSON.parse(readFileSync(fixturePath("snapshot-playing.json"), "utf8"));
const parsed = parsePlaybackSnapshot(fixture);
expect(parsed).not.toBeNull();
expect(parsePlaybackSnapshot(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
expect(parsePlaybackSnapshot({ ...fixture, protocolVersion: 2 })).toBeNull();
```

- [ ] **Step 3: Add Swift fixture tests**

Locate fixtures relative to `#filePath` by walking from `ios/App/AppTests` to repository root. Decode with production `JSONDecoder`, encode, and decode again. Assert duplicate queue occurrence IDs remain distinct and raw enum strings match.

```swift
let testsDirectory = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let fixtureURL = testsDirectory
    .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    .appendingPathComponent("test-fixtures/playback/protocol-v1/snapshot-playing.json")
let decoded = try JSONDecoder().decode(PlaybackSnapshot.self, from: Data(contentsOf: fixtureURL))
XCTAssertEqual(try JSONDecoder().decode(PlaybackSnapshot.self, from: JSONEncoder().encode(decoded)), decoded)
```

- [ ] **Step 4: Add Java fixture tests**

Read from `../test-fixtures/playback/protocol-v1` when Gradle’s working directory is `android`; parse with production model constructors, convert to JSObject/JSON, and parse again. Assert the same fields and protocol rejection.

```java
Path fixture = Paths.get(System.getProperty("user.dir"), "..", "test-fixtures",
    "playback", "protocol-v1", "snapshot-playing.json");
PlaybackSnapshot decoded = PlaybackModels.snapshotFrom(
    new JSObject(Files.readString(fixture)));
assertEquals(decoded, PlaybackModels.snapshotFrom(decoded.toJSObject()));
```

- [ ] **Step 5: Run the three-language contract gate**

```bash
npx vitest run src/lib/playback/protocol.test.ts
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/PlaybackModelsTests CODE_SIGNING_ALLOWED=NO
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.PlaybackModelsTest'
```

Expected: all three suites PASS the same fixtures.

- [ ] **Step 6: Commit canonical fixtures**

Update the ledger to `NP-REL-02`, then:

```bash
git add test-fixtures src/lib/playback/protocol.test.ts ios/App/AppTests/PlaybackModelsTests.swift android/app/src/test/java/com/hymnz/app/playback/PlaybackModelsTest.java docs/superpowers/plans/2026-08-21-native-playback-05-integration-rollout.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "test(playback): share protocol fixtures across platforms"
```

---

### Task NP-REL-02: Complete security, access, and secret-redaction review

**Prerequisites:** `NP-SRV-07`, `NP-WEB-06`, `NP-IOS-06`, `NP-AND-06`.

**Files:**
- Create: `docs/release/native-playback/security-review.md`
- Modify tests only where the audit exposes a missing assertion.

**Interfaces:**
- Produces: Gate evidence for token scope/storage, free-listen boundary, preview cap/ticket, signed URL lifetime, logging, telemetry, and sign-out revocation.

- [ ] **Step 1: Run automated access/security suites**

```bash
npx vitest run src/lib/auth/access.test.ts src/lib/playback/server src/app/api/playback src/app/api/tracks/[id]/audio/route.test.ts src/lib/playback/telemetry-client.test.ts
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:AppTests/PlaybackTokenStoreTests -only-testing:AppTests/PlaybackAPIClientTests -only-testing:AppTests/HymnzPlaybackPluginTests CODE_SIGNING_ALLOWED=NO
./android/gradlew -p android testDebugUnitTest --tests 'com.hymnz.app.playback.PlaybackTokenStoreTest' --tests 'com.hymnz.app.playback.PlaybackApiClientTest'
```

- [ ] **Step 2: Scan for forbidden storage/logging**

```bash
rg -n "localStorage|sessionStorage|UserDefaults|SharedPreferences|console\.(log|warn|error)|print\(|Log\.(d|i|w|e)|Authorization|streamUrl|playbackToken" src/lib/playback ios/App/App/Playback android/app/src/main/java/com/hymnz/app/playback
```

Review every match. Allowed matches are typed fields, in-memory transport, Keychain/Keystore implementation, and explicitly redacted diagnostics. Record each allowed path/reason; remove any credential/signed-URL logging before checking the step.

- [ ] **Step 3: Verify database and endpoint scope in non-production**

Confirm stored session rows contain 64-character hashes only, expired/revoked tokens return 401, a playback bearer is rejected by a normal account endpoint, visitor previews cannot change ticket track/duration, and range starts beyond cap return 416. Use synthetic test accounts and delete test sessions afterward through normal revocation/expiry, not manual production deletes.

- [ ] **Step 4: Verify free-listen mutation boundary**

For a fresh free account/ordinary track, record database state before queue load, after queue load, after first resolve, repeated resolve inside grace, and resolve after grace. Expected: only first actual resolution sets `freeListenConsumedAt`; queue load does nothing; same-listen retries remain full; post-grace becomes preview.

- [ ] **Step 5: Commit security evidence**

Document exact commands/results, reviewed matches, environment, account fixtures, and any changes in `security-review.md`. Update the ledger to `NP-REL-03`, then:

```bash
git add docs/release/native-playback/security-review.md src ios/App/AppTests android/app/src/test docs/superpowers/plans/2026-08-21-native-playback-05-integration-rollout.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "test(playback): verify access and credential boundaries"
```

---

### Task NP-REL-03: Inventory pending mobile changes and run the consolidated matrix

**Prerequisites:** `NP-IOS-07`, `NP-AND-07`, `NP-REL-02`.

**Files:**
- Create: `docs/release/native-playback/pending-mobile-changes.md`
- Create: `docs/release/native-playback/test-matrix.md`
- Create: `docs/release/native-playback/support-triage.md`

**Interfaces:**
- Produces: One auditable release scope combining playback and the owner’s pending Xcode/Google Play work.
- Produces: Device/account/scenario evidence and a support triage script.

- [ ] **Step 1: Inventory every pending release difference**

Compare repository native projects, current production store versions, TestFlight/internal-track builds, and unpublished local Xcode/Android Studio changes. For each difference record: feature/fix, files/commit, platform, user impact, migration/permission/privacy impact, test owner, and include/defer decision. Uncommitted changes must be committed separately or explicitly deferred; do not fold unknown diffs into playback commits.

- [ ] **Step 2: Freeze the release scope**

The include list must name native playback plus every approved pending change. The defer list must state why it is excluded. Record database migration order, server/web deployment commit, iOS/Android source commit, and rollback dependency. Do not add new product features after this checkbox without returning to scope review.

- [ ] **Step 3: Execute the consolidated physical matrix**

Merge iOS/Android gate evidence into one table covering oldest/current OS, visitor/free/Sacred 7/one-free-listen/paid/admin, 1/2/20-item queues, duplicate track, missing/inactive/failed track, all repeat/shuffle/seek transitions, legacy PNG/current JPEG/missing artwork, foreground/locked/background/task removal, interruption/routes/focus, network transitions/offline/expiry, cold paused restore, and WebView reconcile.

- [ ] **Step 4: Verify old binaries against the release server**

Install current production iOS/Android binaries and test the new server/web deployment with native disabled: start/complete three tracks, preview enforcement, one-free-listen, seek/range, artwork fallback, and browser Media Session. Record binary version/build and server commit.

- [ ] **Step 5: Create support triage script**

`support-triage.md` asks for platform, app version/build, approximate time/timezone, locked/background state, output route, account tier, track/queue, network, and whether system controls remained. It explains how support finds telemetry by time/installation without requesting passwords, tokens, cookies, or signed URLs, and how to advise a user to pause/reopen while a cohort is disabled.

```markdown
1. Platform and HYMNZ version/build:
2. Approximate date/time and timezone:
3. Track and queue/collection:
4. Screen locked, backgrounded, or foregrounded:
5. Speaker, wired headphones, or Bluetooth device:
6. Wi-Fi, cellular, transition, or offline:
7. Did lock-screen/notification controls still respond?
8. Account tier (visitor, free, premium); never send credentials or URLs:
```

- [ ] **Step 6: Commit frozen release scope/matrix**

Update the ledger to `NP-REL-04`, then:

```bash
git add docs/release/native-playback/pending-mobile-changes.md docs/release/native-playback/test-matrix.md docs/release/native-playback/support-triage.md docs/superpowers/plans/2026-08-21-native-playback-05-integration-rollout.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "docs(playback): freeze consolidated mobile release scope"
```

---

### Task NP-REL-04: Build the rollout dashboard and rehearse kill switch

**Prerequisites:** `NP-REL-03`.

**Files:**
- Create: `src/lib/playback/server/metrics.ts`
- Create: `src/lib/playback/server/metrics.test.ts`
- Create: `src/app/api/admin/playback-metrics/route.ts`
- Create: `src/app/api/admin/playback-metrics/route.test.ts`
- Create: `src/components/admin/PlaybackMetrics.tsx`
- Modify: `src/components/admin/AdminDashboard.tsx`
- Create: `docs/release/native-playback/rollout-runbook.md`

**Interfaces:**
- Produces: metrics grouped by platform/app version/engine/cohort window.
- Produces: successful-start, completion, unexpected-stop, background-continuation, buffering minutes/hour, failures/100 starts, artwork fallback/blank, and crash-free proxy.
- Produces: exact flag/kill-switch/rollback runbook.

- [ ] **Step 1: Write metric aggregation tests**

Use a fixed event fixture with starts, failures, background enter/exit, buffering durations, artwork results, and completions. Assert denominators explicitly: starts for rates, listening milliseconds for buffering/hour, sessions for crash-free/background, and no division by zero.

- [ ] **Step 2: Run red and implement query/endpoint**

```bash
npx vitest run src/lib/playback/server/metrics.test.ts src/app/api/admin/playback-metrics/route.test.ts
```

Endpoint requires admin auth, validates `from/to/platform/appVersion`, caps range at 30 days, and returns aggregate numbers only. Dashboard shows current web baseline beside each native platform/cohort and marks the release thresholds from Global Constraints.

- [ ] **Step 3: Write exact runbook**

Document current settings, how to set 0/5/25/50/100, minimum versions, protocol 1, how to confirm cohort response, how to disable new sessions, how active sessions wait for pause/end, how to verify telemetry shifts back to web, server/database rollback order, store phased-release pause, and named decision owner.

- [ ] **Step 4: Rehearse kill switch outside production**

Start a native test track, set enabled false, verify the track continues to its pause/end boundary, then verify the next session selects web. Re-enable only the internal environment and confirm stable assignment. Record timestamps/event IDs in the runbook.

- [ ] **Step 5: Verify and commit dashboard/runbook**

```bash
npx vitest run src/lib/playback/server/metrics.test.ts src/app/api/admin/playback-metrics/route.test.ts
npx tsc --noEmit
npx eslint src/lib/playback/server/metrics.ts src/app/api/admin/playback-metrics/route.ts src/components/admin/PlaybackMetrics.tsx
git add src/lib/playback/server/metrics.ts src/lib/playback/server/metrics.test.ts src/app/api/admin/playback-metrics src/components/admin/PlaybackMetrics.tsx src/components/admin/AdminDashboard.tsx docs/release/native-playback/rollout-runbook.md docs/superpowers/plans/2026-08-21-native-playback-05-integration-rollout.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(playback): add rollout metrics and kill switch runbook"
```

Set the ledger to `NP-REL-05`.

---

### Task NP-REL-05: Produce and submit the single 1.1.0 store release

**Prerequisites:** Gate D and `NP-REL-04`.

**Files:**
- Modify: `ios/App/App.xcodeproj/project.pbxproj`
- Modify: `android/app/build.gradle`
- Create: `docs/release/native-playback/store-submission.md`

**Interfaces:**
- Produces: iOS archive and Android AAB for marketing/version name `1.1.0`, containing the frozen pending-change scope and native protocol 1.

- [ ] **Step 1: Resolve monotonic store build numbers**

In App Store Connect, note the highest uploaded iOS build number; set `CURRENT_PROJECT_VERSION` to `max(13, highest uploaded) + 1` and `MARKETING_VERSION = 1.1.0`. In Play Console, note the highest uploaded version code; set `versionCode` to `max(6, highest uploaded) + 1` and `versionName "1.1.0"`. Record old/new values and URLs/screenshots reference in `store-submission.md`.

- [ ] **Step 2: Run the final clean gate from the release commit**

```bash
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run cap:sync
xcodebuild clean test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO
./android/gradlew -p android clean testDebugUnitTest connectedDebugAndroidTest bundleRelease
```

Expected: every command PASS with zero uncommitted generated drift. Record exact counts/artifact hashes.

- [ ] **Step 3: Build signed release artifacts**

Archive/upload iOS through the shared App scheme with the production signing team/profile. Android uses the existing release keystore and produces `android/app/build/outputs/bundle/release/app-release.aab`. Verify bundle IDs, versions, permissions/background declarations, privacy manifests/data safety, and that production native settings are still disabled.

- [ ] **Step 4: Prepare store metadata/review notes**

Release notes state: reliable background/lock-screen playback, system controls, improved queue recovery, and more dependable artwork. Apple review notes explain Audio background mode is used solely for user-initiated music playback and include a test account plus exact steps. Play declarations explain media-playback foreground service and notification. Include all frozen non-playback changes.

- [ ] **Step 5: Confirm target and submit**

Immediately before upload/submission, confirm App Store Connect app `com.hymnz.app`, Google Play app `com.hymnz.app`, version/build numbers, production signing identities, and release scope with the owner. Upload to TestFlight and Play internal first; promote the identical approved binaries to store review/production phased release without rebuilding.

- [ ] **Step 6: Commit version/submission record**

Update the ledger to `NP-REL-06`, then:

```bash
git add ios/App/App.xcodeproj/project.pbxproj android/app/build.gradle docs/release/native-playback/store-submission.md docs/superpowers/plans/2026-08-21-native-playback-05-integration-rollout.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "chore(release): prepare HYMNZ 1.1.0"
```

---

### Task NP-REL-06: Activate 5%, 25%, 50%, and 100% cohorts

**Prerequisites:** Store release available to production users and `NP-REL-05`.

**Files:**
- Modify: `docs/release/native-playback/rollout-runbook.md`
- Modify: `docs/release/native-playback/test-matrix.md`
- Modify: `docs/superpowers/plans/2026-08-21-native-playback-status.md`

**Interfaces:**
- Produces: audited cohort decisions and final 100% activation without a new binary.

- [ ] **Step 1: Activate 5% of compatible 1.1.0 installations**

Set minimum iOS/Android app versions to `1.1.0`, minimum protocol 1, enabled true, rollout 5. Verify five sampled installation IDs remain assigned consistently. Record flag change time/operator and dashboard baseline.

- [ ] **Step 2: Observe 5% gate**

Wait at least 48 hours and 25 starts. Compare all thresholds, support reports, access mismatches, top failure codes/tracks/artwork candidates, iOS/Android split, and old-binary web traffic. If any hard stop or threshold fails, set enabled false, record incident, and leave later cohort steps unchecked.

- [ ] **Step 3: Advance and observe 25%**

Set rollout 25 only after documenting the 5% decision. Observe at least 48 hours/25 new-cohort starts against the same thresholds; sample background sessions and support reports.

- [ ] **Step 4: Advance and observe 50%**

Set rollout 50 only after the 25% decision. Repeat the same evidence window and verify no platform/app-version concentration.

- [ ] **Step 5: Advance and observe 100%**

Set rollout 100 only after the 50% decision. Observe at least 72 hours and 50 starts, rerun one locked-screen physical smoke on each platform, and verify the kill switch still returns new sessions to web.

- [ ] **Step 6: Commit rollout evidence**

Update the ledger to `NP-REL-07`, then:

```bash
git add docs/release/native-playback/rollout-runbook.md docs/release/native-playback/test-matrix.md docs/superpowers/plans/2026-08-21-native-playback-05-integration-rollout.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "docs(playback): complete staged native rollout"
```

---

### Task NP-REL-07: Close the project while retaining fallback

**Prerequisites:** `NP-REL-06` and 100% observation window passed.

**Files:**
- Create: `docs/release/native-playback/post-release-review.md`
- Modify: `docs/superpowers/plans/2026-08-21-native-playback-roadmap.md`
- Modify: `docs/superpowers/plans/2026-08-21-native-playback-status.md`

**Interfaces:**
- Produces: final success evidence, ownership/maintenance notes, and explicit fallback-removal date no earlier than the next native release cycle.

- [ ] **Step 1: Compare final outcomes to baseline**

Record web baseline vs iOS/Android native: start success, completion, unexpected stops, background continuation, buffering/hour, failures/100, artwork fallback/blank, crash-free sessions, and support volume. State sample sizes and observation dates.

- [ ] **Step 2: Confirm product success criteria**

Link passing evidence for 20 locked tracks, 60-minute background, system controls, interruptions/routes, true React reconciliation, current access policy, artwork fallback, old binaries, and kill switch. Every master definition-of-complete checkbox must point to a commit/document.

- [ ] **Step 3: Record retained compatibility and maintenance owners**

Keep `WebPlaybackAdapter`, `/api/tracks/{id}/audio`, capability checks, protocol 1 validators, and kill switch. Record earliest review as after one later iOS/Android production release, who owns protocol changes, token/preview secrets, artwork backfill failures, telemetry retention, and monthly playback dashboard review.

- [ ] **Step 4: Run final repository verification**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO
./android/gradlew -p android testDebugUnitTest assembleDebug
git diff --check
git status --short --branch
```

Expected: all verification PASS and only the intended post-release docs are uncommitted.

- [ ] **Step 5: Commit completion evidence**

Check every master completion item, set ledger state `Complete — fallback retained`, then:

```bash
git add docs/release/native-playback/post-release-review.md docs/superpowers/plans/2026-08-21-native-playback-roadmap.md docs/superpowers/plans/2026-08-21-native-playback-05-integration-rollout.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "docs(playback): close native playback rollout"
```
