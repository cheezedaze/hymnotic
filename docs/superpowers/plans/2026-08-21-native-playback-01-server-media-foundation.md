# Native Playback Server and Media Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide one tested server authority for playback access, scoped native sessions, just-in-time full/preview resolution, normalized artwork, stable rollout assignment, and secret-free telemetry while preserving the legacy audio route.

**Architecture:** Pure access/range/ticket functions sit below both the existing web endpoint and new native endpoints. Authenticated WebViews mint opaque playback tokens whose hashes are stored in PostgreSQL; native engines exchange a track ID for a short-lived signed full URL or range-capable signed preview-ticket URL. Artwork is normalized into versioned assets, settings remain server-controlled, and playback telemetry is accepted through a strict allowlist.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Vitest 3, Drizzle ORM/PostgreSQL, Node crypto, AWS S3/CloudFront, Sharp.

**Spec:** `docs/superpowers/specs/2026-08-21-native-playback-ownership-design.md`

## Global Constraints

- Reuse current visitor/free/paid, Sacred 7, preview-duration, and one-free-listen policy; do not create a second entitlement policy.
- Queue metadata and playback-session creation never consume a free listen.
- A free listen is consumed only inside just-in-time resolution and retains the existing 10-minute same-listen grace behavior.
- Store only SHA-256 hashes of 32-byte opaque playback tokens; expire them after exactly 24 hours.
- A playback token authorizes only `/api/playback/resolve`, `/api/playback/revoke`, and `/api/playback/events`.
- Preview tickets are track-bound, duration-bound, expire after 10 minutes, and reject tampering.
- Full stream URLs use existing CloudFront signing and expire after 15 minutes for native resolution; the legacy web redirect keeps its current TTL until measured migration proves safe.
- All preview responses support `Range`, never serve bytes beyond the calculated cap, and use `Cache-Control: private, no-store`.
- Runtime native playback defaults disabled and rollout assignment is stable per installation.
- Artwork output is RGB JPEG at 512×512 and 1024×1024; retain the original key and reject undecodable input.
- Telemetry never stores bearer tokens, signed URLs, cookies, request bodies outside the event schema, lyrics, or free-form user content.
- Preserve `/api/tracks/{id}/audio` for web and old native binaries.

## File map

### Shared protocol and access

- Create `src/lib/playback/types.ts` — protocol version 1 types shared by server and React.
- Create `src/lib/playback/server/access-policy.ts` — pure access decision.
- Create `src/lib/playback/server/access-policy.test.ts` — literal policy matrix.
- Create `src/lib/playback/server/preview-range.ts` — byte-range parser and cap calculation.
- Create `src/lib/playback/server/preview-range.test.ts` — valid/invalid range coverage.
- Modify `src/lib/auth/access.ts` — add fresh database-backed user context without changing cookie context.
- Modify `src/app/api/tracks/[id]/audio/route.ts` — delegate to shared policy/range helpers.
- Create `src/app/api/tracks/[id]/audio/route.test.ts` — legacy compatibility matrix.

### Playback sessions and resolution

- Modify `src/lib/db/schema.ts` — add `playbackSessions`.
- Create `drizzle/0013_playback_sessions.sql`, `drizzle/0014_artwork_assets.sql`, `drizzle/0015_playback_events.sql`, and their generated Drizzle metadata in separate schema tasks.
- Create `src/lib/playback/server/playback-token.ts` and test — token generation, hashing, bearer parsing.
- Create `src/lib/playback/server/playback-sessions.ts` — create/authenticate/revoke database operations.
- Create `src/app/api/playback/session/route.ts` and test — cookie-authenticated token minting.
- Create `src/app/api/playback/revoke/route.ts` and test — scoped revocation.
- Create `src/lib/playback/server/preview-ticket.ts` and test — HMAC ticket signing/verification.
- Create `src/app/api/playback/preview/[ticket]/route.ts` and test — range-capable preview delivery.
- Create `src/lib/playback/server/resolve.ts` and test — current-tier just-in-time resolver.
- Create `src/app/api/playback/resolve/route.ts` and test — bearer/visitor transport contract.

### Artwork, settings, and telemetry

- Modify `src/lib/db/schema.ts` — add `artworkAssets`, track/collection asset references, and `playbackEvents`.
- Create `src/lib/playback/server/artwork.ts` and test — candidates and fallback ordering.
- Create `src/lib/playback/server/artwork-processing.ts` and test — Sharp normalization.
- Create `src/app/api/admin/artwork/process/route.ts` and test — process a presigned original.
- Modify `src/components/admin/AdminFileUpload.tsx`, `src/components/admin/EditTrack.tsx`, `src/components/admin/EditCollection.tsx`, and matching admin routes — persist asset IDs.
- Create `scripts/backfill-artwork-assets.ts` — idempotent legacy catalog backfill.
- Modify `package.json` and `package-lock.json` — add Sharp and scripts.
- Create `src/lib/playback/server/settings.ts` and test — validated DB settings and deterministic cohort.
- Create `src/app/api/playback/settings/route.ts` and test — compatibility response.
- Modify `src/components/admin/SettingsManager.tsx` — controlled playback settings.
- Create `src/lib/playback/server/telemetry.ts` and test — event allowlist/redaction.
- Create `src/app/api/playback/events/route.ts` and test — batched ingestion.
- Modify `.env.example` — document `PLAYBACK_PREVIEW_SECRET`.

---

### Task NP-SRV-01: Freeze protocol version 1 and extract the access decision

**Prerequisites:** `NP-BASE-01`.

**Files:**
- Create: `src/lib/playback/types.ts`
- Create: `src/lib/playback/server/access-policy.ts`
- Create: `src/lib/playback/server/access-policy.test.ts`
- Modify: `src/lib/auth/access.ts`

**Interfaces:**
- Produces: `PLAYBACK_PROTOCOL_VERSION`, `PlaybackQueueItem`, `ArtworkCandidate`, `PlaybackSnapshot`, `PlaybackResolution`, `PlaybackFailure`, and related unions exactly matching the approved spec.
- Produces: `decidePlaybackAccess(input: PlaybackAccessInput): PlaybackAccessDecision`.
- Produces: `getAccessContextForUser(userId: string): Promise<AccessContext | null>` which reads the current database user rather than a token-time tier.
- Consumers: All later server tasks and every task in the shared/iOS/Android plans.

- [ ] **Step 1: Write the failing access matrix**

Create `src/lib/playback/server/access-policy.test.ts` with these literal cases:

```ts
import { describe, expect, it } from "vitest";
import { decidePlaybackAccess } from "./access-policy";

const base = { trackId: "ordinary", durationSeconds: 240, sacred7TrackIds: [] };

describe("decidePlaybackAccess", () => {
  it.each([
    ["paid", false, "full", false, 240],
    ["free", true, "full", true, 240],
    ["free", false, "preview", false, 60],
    ["visitor", false, "preview", false, 30],
  ] as const)("maps %s/free=%s", (tier, freeListenAvailable, access, consume, seconds) => {
    expect(decidePlaybackAccess({ ...base, tier, freeListenAvailable })).toEqual({
      access,
      consumeFreeListen: consume,
      playableDurationSeconds: seconds,
    });
  });

  it("always grants a Sacred 7 track to a free user without consumption", () => {
    expect(decidePlaybackAccess({
      ...base,
      tier: "free",
      sacred7TrackIds: ["ordinary"],
      freeListenAvailable: false,
    })).toEqual({ access: "full", consumeFreeListen: false, playableDurationSeconds: 240 });
  });
});
```

- [ ] **Step 2: Run the focused test and observe the missing-module failure**

```bash
npx vitest run src/lib/playback/server/access-policy.test.ts
```

Expected: FAIL because `access-policy.ts` does not exist.

- [ ] **Step 3: Create the exact shared protocol and access interfaces**

In `src/lib/playback/types.ts`, copy the protocol types from the approved spec verbatim and add these transport types:

```ts
export const PLAYBACK_PROTOCOL_VERSION = 1 as const;

export interface PlaybackSessionResponse {
  playbackToken: string;
  playbackTokenExpiresAt: string;
}

export interface PlaybackSettingsResponse {
  enabled: boolean;
  protocolVersion: 1;
  minimumProtocolVersion: 1;
  minimumIOSVersion: string;
  minimumAndroidVersion: string;
  rolloutPercent: number;
  fallbackReason: string | null;
}

export interface PlaybackResolution {
  trackId: string;
  streamUrl: string;
  streamExpiresAt: string;
  access: "full" | "preview";
  playableDurationSeconds: number;
  artwork: ArtworkCandidate[];
}
```

Create `access-policy.ts` with exact input/output types and implement paid → Sacred 7 → free-listen → preview precedence:

```ts
export interface PlaybackAccessInput {
  tier: UserTier;
  trackId: string;
  durationSeconds: number;
  sacred7TrackIds: string[];
  freeListenAvailable: boolean;
}

export interface PlaybackAccessDecision {
  access: "full" | "preview";
  consumeFreeListen: boolean;
  playableDurationSeconds: number;
}
```

- [ ] **Step 4: Add fresh user access lookup**

In `src/lib/auth/access.ts`, add:

```ts
export async function getAccessContextForUser(
  userId: string
): Promise<AccessContext | null> {
  const user = await getUserById(userId);
  if (!user) return null;
  const isAdmin = user.role === "ADMIN";
  const isPremium = isAdmin || user.isPremium || user.manualPremium;
  return { tier: isPremium ? "paid" : "free", userId, isPremium, isAdmin };
}
```

Import `getUserById` from `@/lib/db/queries`. Do not change `getAccessContext()` behavior in this task.

- [ ] **Step 5: Run focused and existing access tests**

```bash
npx vitest run src/lib/playback/server/access-policy.test.ts src/lib/auth/access.test.ts
npx tsc --noEmit
```

Expected: all tests and typecheck PASS.

- [ ] **Step 6: Commit the frozen contract**

Check every completed step, set the status ledger to `Next task: NP-SRV-02`, then:

```bash
git add src/lib/playback/types.ts src/lib/playback/server/access-policy.ts src/lib/playback/server/access-policy.test.ts src/lib/auth/access.ts docs/superpowers/plans/2026-08-21-native-playback-01-server-media-foundation.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(playback): freeze protocol and access policy"
```

---

### Task NP-SRV-02: Add scoped playback sessions

**Prerequisites:** `NP-SRV-01`.

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0013_playback_sessions.sql` and its generated metadata
- Create: `src/lib/playback/server/playback-token.ts`
- Create: `src/lib/playback/server/playback-token.test.ts`
- Create: `src/lib/playback/server/playback-sessions.ts`
- Create: `src/app/api/playback/session/route.ts`
- Create: `src/app/api/playback/session/route.test.ts`
- Create: `src/app/api/playback/revoke/route.ts`
- Create: `src/app/api/playback/revoke/route.test.ts`

**Interfaces:**
- Produces: `generatePlaybackToken(): string`, `hashPlaybackToken(token: string): string`, and `readBearerToken(header: string | null): string | null`.
- Produces: `createPlaybackSession(userId, installationId, now?): Promise<PlaybackSessionResponse>`.
- Produces: `authenticatePlaybackToken(header, now?): Promise<{ sessionId: number; userId: string } | null>`.
- Produces: `revokePlaybackSession(sessionId, now?): Promise<void>`.
- Consumers: `NP-SRV-04`, `NP-SRV-07`, `NP-WEB-05`, iOS API client, and Android resolver.

- [ ] **Step 1: Write token primitive tests**

Create `playback-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generatePlaybackToken, hashPlaybackToken, readBearerToken } from "./playback-token";

describe("playback tokens", () => {
  it("generates unique 32-byte base64url tokens", () => {
    const one = generatePlaybackToken();
    const two = generatePlaybackToken();
    expect(one).not.toBe(two);
    expect(Buffer.from(one, "base64url")).toHaveLength(32);
  });
  it("hashes deterministically without returning the token", () => {
    expect(hashPlaybackToken("secret")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPlaybackToken("secret")).not.toContain("secret");
  });
  it.each([[null], ["Basic abc"], ["Bearer"], ["Bearer  two"]])(
    "rejects malformed authorization %s",
    (header) => expect(readBearerToken(header)).toBeNull()
  );
  it("reads one bearer token", () => {
    expect(readBearerToken("Bearer abc_123-xyz")).toBe("abc_123-xyz");
  });
});
```

- [ ] **Step 2: Run red**

```bash
npx vitest run src/lib/playback/server/playback-token.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add the schema and SQL migration**

Add this Drizzle table after auth tokens:

```ts
export const playbackSessions = pgTable(
  "playback_sessions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    installationId: varchar("installation_id", { length: 128 }),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_playback_sessions_token_hash").on(table.tokenHash),
    index("idx_playback_sessions_user").on(table.userId),
    index("idx_playback_sessions_expiry").on(table.expiresAt),
  ]
);
```

After the Phase 0 journal audit is green, generate `drizzle/0013_playback_sessions.sql` with the equivalent `CREATE TABLE`, foreign key, unique index, user index, and expiry index. Do not edit prior numbered migrations.

- [ ] **Step 4: Implement token primitives and repository operations**

Use `randomBytes(32)`, `createHash("sha256")`, an exact 24-hour expiry, and update `lastUsedAt` only after a valid non-revoked, non-expired row is found. `createPlaybackSession` must insert only the hash and return the raw token once. `authenticatePlaybackToken` must query by the hash and must not log either value.

```ts
export async function createPlaybackSession(
  userId: string,
  installationId: string,
  now = new Date()
): Promise<PlaybackSessionResponse> {
  const playbackToken = generatePlaybackToken();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await db.insert(playbackSessions).values({
    userId,
    installationId,
    tokenHash: hashPlaybackToken(playbackToken),
    expiresAt,
  });
  return { playbackToken, playbackTokenExpiresAt: expiresAt.toISOString() };
}
```

- [ ] **Step 5: Write and implement route contract tests**

Mock `auth()`/session repository at the module boundary and cover:

```ts
expect(await postSession({ authenticated: false })).toMatchObject({ status: 401 });
expect(await postSession({ authenticated: true, installationId: "ios-1" }))
  .toMatchObject({ status: 200 });
expect(await revoke({ bearer: "valid" })).toMatchObject({ status: 204 });
expect(await revoke({ bearer: "expired" })).toMatchObject({ status: 401 });
```

`POST /api/playback/session` accepts `{ installationId: string }`, authenticates the existing cookie with `auth()`, validates 1–128 characters, and returns `PlaybackSessionResponse`. `POST /api/playback/revoke` authenticates only the bearer token and returns 204.

- [ ] **Step 6: Run migration generation comparison and tests**

```bash
npx vitest run src/lib/playback/server/playback-token.test.ts src/app/api/playback/session/route.test.ts src/app/api/playback/revoke/route.test.ts
npx tsc --noEmit
npm run db:generate -- --name playback_sessions
test -f drizzle/0013_playback_sessions.sql
```

Expected: tests/typecheck PASS and generated SQL is semantically identical. If Drizzle creates a differently numbered migration because the journal advanced, keep the generated filename and update every later plan reference before committing.

- [ ] **Step 7: Commit sessions**

Update the ledger to `NP-SRV-03`, then:

```bash
git add src/lib/db/schema.ts drizzle src/lib/playback/server/playback-token.ts src/lib/playback/server/playback-token.test.ts src/lib/playback/server/playback-sessions.ts src/app/api/playback/session src/app/api/playback/revoke docs/superpowers/plans/2026-08-21-native-playback-01-server-media-foundation.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(playback): add scoped native sessions"
```

---

### Task NP-SRV-03: Sign preview tickets and centralize capped range delivery

**Prerequisites:** `NP-SRV-01`.

**Files:**
- Create: `src/lib/playback/server/preview-ticket.ts`
- Create: `src/lib/playback/server/preview-ticket.test.ts`
- Create: `src/lib/playback/server/preview-range.ts`
- Create: `src/lib/playback/server/preview-range.test.ts`
- Create: `src/lib/playback/server/serve-preview.ts`
- Create: `src/app/api/playback/preview/[ticket]/route.ts`
- Create: `src/app/api/playback/preview/[ticket]/route.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `createPreviewTicket(input, secret, now?): string` and `verifyPreviewTicket(ticket, secret, now?): PreviewTicketClaims | null`.
- Produces: `parseByteRange(header): number | null` and `calculatePreviewByteCap(totalBytes, durationSeconds, previewSeconds): number`.
- Produces: `servePreviewTrack(input): Promise<Response>` shared with the legacy route.
- Consumers: `NP-SRV-04` and legacy audio-route extraction in `NP-SRV-04`.

- [ ] **Step 1: Write ticket and range tests**

Use fixed `now = new Date("2026-08-21T00:00:00Z")`, a test secret, and assert:

```ts
const ticket = createPreviewTicket(
  { trackId: "carry-on", playableDurationSeconds: 60, expiresAt: "2026-08-21T00:10:00.000Z" },
  "test-secret"
);
expect(verifyPreviewTicket(ticket, "test-secret", now)?.trackId).toBe("carry-on");
expect(verifyPreviewTicket(`${ticket}x`, "test-secret", now)).toBeNull();
expect(verifyPreviewTicket(ticket, "wrong-secret", now)).toBeNull();
expect(parseByteRange("bytes=1024-")).toBe(1024);
expect(parseByteRange("bytes=2-3,8-9")).toBeNull();
expect(calculatePreviewByteCap(12_000_000, 240, 60)).toBe(3_500_000);
```

The last value includes the approved 10-second margin: `12,000,000 × 70 / 240`.

- [ ] **Step 2: Run red**

```bash
npx vitest run src/lib/playback/server/preview-ticket.test.ts src/lib/playback/server/preview-range.test.ts
```

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement the exact ticket format**

Encode canonical JSON claims as base64url, sign the encoded payload with `HMAC-SHA256`, and join with one period:

```ts
export interface PreviewTicketClaims {
  version: 1;
  trackId: string;
  playableDurationSeconds: number;
  expiresAt: string;
}

const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
return `${encoded}.${signature}`;
```

Verification requires exactly two segments, `timingSafeEqual`, version 1, a positive duration, a non-empty track ID, and `expiresAt > now`.

- [ ] **Step 4: Implement shared preview serving**

`servePreviewTrack` accepts `{ request, audioKey, durationSeconds, previewSeconds }`. It uses existing `getObjectRange`, a maximum fetch of 3,000,000 bytes, the 10-second margin, 416 for starts beyond the cap, 206 when `Range` is present, and the exact headers already used by `/api/tracks/[id]/audio`.

```ts
export async function servePreviewTrack({
  request,
  audioKey,
  durationSeconds,
  previewSeconds,
}: ServePreviewInput): Promise<Response> {
  const start = parseByteRange(request.headers.get("range"));
  if (start === null) return new Response(null, { status: 416 });
  const fetched = await getObjectRange(audioKey, start, start + 3_000_000 - 1);
  const cap = calculatePreviewByteCap(fetched.total, durationSeconds, previewSeconds);
  return buildCappedRangeResponse(fetched.bytes, start, cap, request.headers.has("range"));
}
```

- [ ] **Step 5: Implement the ticket route**

`GET /api/playback/preview/[ticket]` reads `PLAYBACK_PREVIEW_SECRET`, verifies claims, loads the active track, rejects track/key mismatches as 404, and calls `servePreviewTrack`. Add to `.env.example`:

```dotenv
# HMAC secret for 10-minute, track-bound native preview tickets.
# Generate independently with: openssl rand -base64 32
PLAYBACK_PREVIEW_SECRET=
```

- [ ] **Step 6: Verify preview boundaries**

```bash
npx vitest run src/lib/playback/server/preview-ticket.test.ts src/lib/playback/server/preview-range.test.ts src/app/api/playback/preview/[ticket]/route.test.ts
npx tsc --noEmit
```

Expected: ticket, tamper, expiration, range, 416, 206, and no-store cases PASS.

- [ ] **Step 7: Commit preview delivery**

Update the ledger to `NP-SRV-04`, then commit the listed files with:

```bash
git commit -m "feat(playback): add signed native previews"
```

---

### Task NP-SRV-04: Implement just-in-time resolution and preserve the legacy route

**Prerequisites:** `NP-SRV-01`, `NP-SRV-02`, `NP-SRV-03`.

**Files:**
- Create: `src/lib/playback/server/resolve.ts`
- Create: `src/lib/playback/server/resolve.test.ts`
- Create: `src/app/api/playback/resolve/route.ts`
- Create: `src/app/api/playback/resolve/route.test.ts`
- Modify: `src/app/api/tracks/[id]/audio/route.ts`
- Create: `src/app/api/tracks/[id]/audio/route.test.ts`
- Modify: `src/lib/s3/client.ts`
- Modify: `src/lib/s3/client.test.ts`

**Interfaces:**
- Produces: `resolvePlaybackTrack(input: ResolvePlaybackInput): Promise<PlaybackResolution | ResolveFailure>`.
- Produces: `signAudioUrl(key, ttlSeconds)` with native calls passing `900` seconds.
- HTTP input: `POST /api/playback/resolve` body `{ trackId: string }`, optional bearer token.
- HTTP success: exact `PlaybackResolution`; failures use stable JSON `{ error: { code, recoverable, retryAfterSeconds } }`.
- Consumers: `NP-WEB-05`, `NP-IOS-03`, and `NP-AND-03`.

- [ ] **Step 1: Write the resolver policy matrix**

Mock track lookup, bearer authentication, fresh user context, Sacred 7 lookup, `grantFreeListen`, signing, ticket signing, and artwork candidates. Assert:

```ts
it.each([
  ["visitor", "preview", 30, 0],
  ["free-available", "full", 240, 1],
  ["free-consumed", "preview", 60, 0],
  ["sacred7", "full", 240, 0],
  ["paid", "full", 240, 0],
  ["admin", "full", 240, 0],
] as const)("resolves %s", async (scenario, access, seconds, grants) => {
  const result = await runScenario(scenario);
  expect(result).toMatchObject({ access, playableDurationSeconds: seconds });
  expect(grantFreeListen).toHaveBeenCalledTimes(grants);
});
```

Also assert inactive/missing audio → `track_unavailable`, expired bearer → `authentication_required`, signing failure does not call `grantFreeListen`, and queue metadata loading has no resolver call.

- [ ] **Step 2: Run red**

```bash
npx vitest run src/lib/playback/server/resolve.test.ts src/app/api/playback/resolve/route.test.ts
```

Expected: FAIL because resolver and route do not exist.

- [ ] **Step 3: Implement resolution in safe order**

The implementation order is mandatory:

1. Validate track ID and load an active track with audio.
2. Authenticate bearer when present; a supplied invalid bearer never downgrades to visitor.
3. Load current user tier from the database and Sacred 7 IDs.
4. Compute access without mutating data.
5. Mint the full signed URL or preview ticket URL.
6. Only after a full URL exists, atomically call `grantFreeListen` when `consumeFreeListen` is true.
7. If the grant loses a race, discard the full URL and return a preview resolution.
8. Attach ordered artwork candidates and a 15-minute/10-minute ISO expiration.

```ts
export async function resolvePlaybackTrack(
  input: ResolvePlaybackInput
): Promise<PlaybackResolution | ResolveFailure> {
  const candidate = await prepareResolutionCandidate(input);
  if (!candidate.ok) return candidate.failure;
  const stream = await mintStream(candidate);
  if (!stream.ok) return stream.failure;
  const access = candidate.consumeFreeListen
    ? await claimOrDowngradeFreeListen(candidate, stream)
    : stream;
  return attachArtwork(access, await getArtworkCandidates(input.trackId));
}
```

- [ ] **Step 4: Implement transport and visitor rate limit**

Use `isRateLimited(`playback-resolve:${ip}`, 60_000, 30)` only for visitors. Return 429 with `Retry-After: 60`; authenticated engines are protected by scoped tokens and telemetry. Never include upstream/native exception text in the response.

```ts
if (!identity && isRateLimited(`playback-resolve:${requestIp(request)}`, 60_000, 30)) {
  return NextResponse.json(
    { error: { code: "rate_limited", recoverable: true, retryAfterSeconds: 60 } },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
```

- [ ] **Step 5: Refactor the legacy route onto shared functions**

Replace its inline policy and range math with `decidePlaybackAccess` and `servePreviewTrack`, while retaining cookie authentication, redirect status 302, existing free-listen grace, and current full signed-URL TTL. The new route test must compare all six access scenarios against the pre-refactor expected status/headers.

```ts
const decision = decidePlaybackAccess({
  tier: access.tier,
  trackId: id,
  durationSeconds: track.duration,
  sacred7TrackIds: sacred7,
  freeListenAvailable,
});
if (decision.access === "preview") {
  return servePreviewTrack({
    request,
    audioKey: track.audioKey,
    durationSeconds: track.duration,
    previewSeconds: decision.playableDurationSeconds,
  });
}
```

- [ ] **Step 6: Run all access and media tests**

```bash
npx vitest run src/lib/auth/access.test.ts src/lib/s3/client.test.ts src/lib/playback/server src/app/api/playback src/app/api/tracks/[id]/audio/route.test.ts
npx tsc --noEmit
```

Expected: all tests/typecheck PASS; the legacy compatibility test is the regression gate.

- [ ] **Step 7: Commit resolver and compatibility extraction**

Update the ledger to `NP-SRV-05`, then commit with:

```bash
git commit -m "feat(playback): resolve native streams just in time"
```

---

### Task NP-SRV-05: Add normalized artwork assets and idempotent backfill

**Prerequisites:** `NP-SRV-04`.

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0014_artwork_assets.sql` and its generated metadata
- Create: `src/lib/playback/server/artwork-processing.ts`
- Create: `src/lib/playback/server/artwork-processing.test.ts`
- Create: `src/lib/playback/server/artwork.ts`
- Create: `src/lib/playback/server/artwork.test.ts`
- Create: `src/app/api/admin/artwork/process/route.ts`
- Create: `src/app/api/admin/artwork/process/route.test.ts`
- Modify: `src/components/admin/AdminFileUpload.tsx`
- Modify: `src/components/admin/EditTrack.tsx`
- Modify: `src/components/admin/EditCollection.tsx`
- Modify: `src/app/api/admin/tracks/route.ts`
- Modify: `src/app/api/admin/tracks/[id]/route.ts`
- Modify: `src/app/api/admin/collections/route.ts`
- Modify: `src/app/api/admin/collections/[id]/route.ts`
- Create: `scripts/backfill-artwork-assets.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `normalizeArtwork(input: Buffer): Promise<NormalizedArtwork>`.
- Produces: `getArtworkCandidates(trackId): Promise<ArtworkCandidate[]>` ordered track → collection → brand.
- Produces: admin response `{ assetId, originalKey, square512Key, square1024Key, mimeType: "image/jpeg" }`.
- Consumers: Resolver, catalog mapping in `NP-WEB-01`, iOS Now Playing, and Android metadata.

- [ ] **Step 1: Install Sharp and write normalization tests**

```bash
npm install sharp
```

Generate an in-memory 600×400 transparent PNG in the test and assert:

```ts
const result = await normalizeArtwork(source);
expect(result.square512).toMatchObject({ width: 512, height: 512, mimeType: "image/jpeg" });
expect(result.square1024).toMatchObject({ width: 1024, height: 1024, mimeType: "image/jpeg" });
expect((await sharp(result.square512.bytes).metadata()).space).toBe("srgb");
await expect(normalizeArtwork(Buffer.from("not-image"))).rejects.toThrow("invalid_artwork");
```

- [ ] **Step 2: Run red**

```bash
npx vitest run src/lib/playback/server/artwork-processing.test.ts
```

Expected: FAIL because the processor does not exist.

- [ ] **Step 3: Add artwork schema**

Create `artwork_assets` with `id`, `original_key`, `square_512_key`, `square_1024_key`, fixed MIME/width/height metadata, and timestamps. Add nullable `artwork_asset_id` foreign keys to `tracks` and `collections`, then run `npm run db:generate -- --name artwork_assets` and verify it creates `drizzle/0014_artwork_assets.sql`. Do not change `0013_playback_sessions.sql` after it is committed.

```ts
export const artworkAssets = pgTable("artwork_assets", {
  id: serial("id").primaryKey(),
  originalKey: text("original_key").notNull(),
  square512Key: text("square_512_key").notNull(),
  square1024Key: text("square_1024_key").notNull(),
  mimeType: varchar("mime_type", { length: 32 }).notNull().default("image/jpeg"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 4: Implement processing and candidate order**

`normalizeArtwork` must call `rotate()`, `flatten({ background: "#141A24" })`, `toColourspace("srgb")`, `resize(size, size, { fit: "cover", position: "centre" })`, and `jpeg({ quality: 88, mozjpeg: true })` for each derivative. `getArtworkCandidates` returns 1024 then 512 for the track asset, then collection asset, then:

```ts
{
  url: "https://www.hymnz.com/images/playback-brand-1024.jpg",
  mimeType: "image/jpeg",
  width: 1024,
  height: 1024,
  role: "brand",
}
```

Add the corresponding bundled public asset by deriving it once from `assets/icon.png`; do not regenerate it on requests.

- [ ] **Step 5: Implement admin processing flow**

For `folder === "images/artwork"`, `AdminFileUpload` first uploads the original through the existing presigned path, then posts `{ originalKey }` to `/api/admin/artwork/process`. The server fetches only keys beginning `images/artwork/`, normalizes, uploads immutable derivative keys, inserts the asset row, and returns the contract. Track/collection edit forms submit `artworkAssetId` along with the legacy original `artworkKey`.

```ts
const original = await uploadViaPresignedUrl(file, "images/artwork", setProgress);
const processed = await fetch("/api/admin/artwork/process", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ originalKey: original.key }),
});
if (!processed.ok) throw new Error("Artwork processing failed");
const asset = (await processed.json()) as ProcessedArtworkResponse;
onUploadComplete({ key: asset.originalKey, cdnUrl: original.cdnUrl, artworkAssetId: asset.assetId });
```

- [ ] **Step 6: Implement and dry-run the backfill**

Add script `artwork:backfill`:

```json
"artwork:backfill": "npx tsx scripts/backfill-artwork-assets.ts"
```

The script selects only track/collection rows with a legacy `artworkKey` and null `artworkAssetId`, normalizes each unique key once, updates all owners in a transaction, records success/failure counts, and supports `--dry-run` without S3/database writes.

```bash
npm run artwork:backfill -- --dry-run
```

Expected: prints candidate counts and zero writes; a second dry run returns the same counts.

- [ ] **Step 7: Verify artwork paths**

```bash
npx vitest run src/lib/playback/server/artwork-processing.test.ts src/lib/playback/server/artwork.test.ts src/app/api/admin/artwork/process/route.test.ts
npx tsc --noEmit
npx eslint src/lib/playback/server/artwork-processing.ts src/lib/playback/server/artwork.ts src/components/admin/AdminFileUpload.tsx src/components/admin/EditTrack.tsx src/components/admin/EditCollection.tsx
```

Expected: corrupt input, normalization dimensions, upload authorization, candidate order, and brand fallback PASS.

- [ ] **Step 8: Commit artwork pipeline**

Update the ledger to `NP-SRV-06`, then commit with:

```bash
git commit -m "feat(playback): normalize and backfill artwork"
```

---

### Task NP-SRV-06: Add deterministic settings and emergency control

**Prerequisites:** `NP-SRV-02`.

**Files:**
- Create: `src/lib/playback/server/settings.ts`
- Create: `src/lib/playback/server/settings.test.ts`
- Create: `src/app/api/playback/settings/route.ts`
- Create: `src/app/api/playback/settings/route.test.ts`
- Modify: `src/components/admin/SettingsManager.tsx`
- Modify: `src/app/api/admin/settings/route.ts`

**Interfaces:**
- Produces: `getPlaybackSettings(input): Promise<PlaybackSettingsResponse>`.
- Input: `{ installationId, platform: "ios" | "android" | "web", appVersion, protocolVersion }`.
- Settings keys: `native_playback_enabled`, `native_playback_rollout_percent`, `native_playback_min_ios_version`, `native_playback_min_android_version`, `native_playback_min_protocol`, `native_playback_fallback_reason`.
- Consumers: `NP-WEB-02` engine selection and `NP-REL-04` rollout.

- [ ] **Step 1: Write settings tests**

Assert disabled-by-default, invalid values fail closed, semantic version floor, protocol floor, and stable cohort:

```ts
expect(stableRolloutBucket("install-a")).toBe(stableRolloutBucket("install-a"));
expect(stableRolloutBucket("install-a")).toBeGreaterThanOrEqual(0);
expect(stableRolloutBucket("install-a")).toBeLessThan(100);
expect(await enabled({ appVersion: "1.0.3", minimum: "1.0.4" })).toBe(false);
expect(await enabled({ protocolVersion: 0, minimumProtocolVersion: 1 })).toBe(false);
```

- [ ] **Step 2: Run red and implement pure parsing**

```bash
npx vitest run src/lib/playback/server/settings.test.ts
```

Use SHA-256 of `installationId`, interpret the first eight hex digits as an unsigned integer, and compute modulo 100. Parse rollout as an integer clamped 0–100. Compare dot-separated numeric versions without prerelease semantics.

- [ ] **Step 3: Implement settings route**

`GET /api/playback/settings?installationId=...&platform=ios&appVersion=1.0.4&protocolVersion=1` validates every parameter and returns the exact response with `Cache-Control: private, no-store`. Web always returns `enabled: false` for native selection.

```ts
export async function GET(request: NextRequest) {
  const input = parsePlaybackSettingsQuery(request.nextUrl.searchParams);
  if (!input) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  return NextResponse.json(await getPlaybackSettings(input), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
```

- [ ] **Step 4: Add validated admin controls**

Render a checkbox for enabled, numeric 0–100 input for rollout, version inputs, numeric protocol input fixed at minimum 1, and text fallback reason. The admin API accepts the six playback keys plus the existing `artvue_link_url` and `artvue_link_text` keys, validates each value before `upsertSetting`, and rejects every other key with 400.

```ts
const ALLOWED_SETTING_KEYS = new Set([
  "artvue_link_url", "artvue_link_text", "native_playback_enabled",
  "native_playback_rollout_percent", "native_playback_min_ios_version",
  "native_playback_min_android_version", "native_playback_min_protocol",
  "native_playback_fallback_reason",
]);
if (!ALLOWED_SETTING_KEYS.has(key) || !isValidSettingValue(key, value)) {
  return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
}
```

- [ ] **Step 5: Verify kill-switch behavior**

```bash
npx vitest run src/lib/playback/server/settings.test.ts src/app/api/playback/settings/route.test.ts
npx tsc --noEmit
```

Expected: disabled, version, protocol, stable cohort, malformed input, and admin allowlist cases PASS.

- [ ] **Step 6: Commit settings**

Update the ledger to `NP-SRV-07`, then commit with:

```bash
git commit -m "feat(playback): add deterministic rollout settings"
```

---

### Task NP-SRV-07: Add allowlisted playback telemetry and complete Gate A

**Prerequisites:** `NP-SRV-04`, `NP-SRV-05`, `NP-SRV-06`.

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0015_playback_events.sql` and its generated metadata
- Create: `src/lib/playback/server/telemetry.ts`
- Create: `src/lib/playback/server/telemetry.test.ts`
- Create: `src/app/api/playback/events/route.ts`
- Create: `src/app/api/playback/events/route.test.ts`
- Create: `docs/release/native-playback/server-gate.md`

**Interfaces:**
- Produces: `parsePlaybackEvent(value: unknown): PlaybackEventInput | null` with required UUID `eventId` for idempotency.
- HTTP input: `{ events: PlaybackEventInput[] }`, maximum 50 events and 64 KB request body.
- HTTP output: 202 with `{ accepted: number }`; invalid batch → 400; invalid/expired supplied bearer → 401.
- Consumers: `NP-WEB-06`, native engines, and rollout dashboard/runbook.

- [ ] **Step 1: Add event schema and parser tests**

The database table contains: `id`, unique UUID `eventId`, nullable `userId`, `installationId`, `platform`, `appVersion`, `protocolVersion`, `engine`, `eventName`, nullable `trackId`, nullable `sessionId`, nullable `reason`, nullable `failureCode`, nullable integer `durationMs`, nullable integer `count`, and `occurredAt`/`receivedAt`. It contains no JSON payload column. After adding it to `schema.ts`, run `npm run db:generate -- --name playback_events` and verify it creates `drizzle/0015_playback_events.sql`; do not modify either prior playback migration.

The allowlist is exactly:

```ts
export const PLAYBACK_EVENT_NAMES = [
  "engine_selected", "playback_requested", "playback_started", "playback_paused",
  "playback_completed", "buffering_started", "buffering_ended", "resolution_completed",
  "retry", "playback_failed", "background_entered", "background_exited",
  "track_transition", "interruption", "route_change", "artwork_result",
  "engine_recovered_unclean",
] as const;
```

Tests pass valid scalar fields and reject extra keys named `token`, `streamUrl`, `cookie`, `lyrics`, `message`, or `payload`.

- [ ] **Step 2: Run red and implement strict parsing**

```bash
npx vitest run src/lib/playback/server/telemetry.test.ts
```

The parser constructs a new object field by field, requires a UUID `eventId`, caps string identifiers at 128 characters, allows only known enum values, clamps nonnegative durations/counts, and discards rather than stores unknown keys.

- [ ] **Step 3: Implement batched ingestion**

Authenticate an optional bearer exactly like resolve. A supplied invalid bearer returns 401. Without a bearer, use the Auth.js cookie when present; only a true visitor is subject to `isRateLimited` at 120 events/minute/IP. Insert valid rows with `eventId` conflict-ignore and return 202. For each newly inserted authenticated `playback_started` event, increment global/user play counts and create the existing play event in the same transaction; a retried `eventId` must never double-count. This replaces the removed hook-side `/api/tracks/{id}/play` call for the shared web/native controller while preserving current visitor behavior.

```ts
export async function ingestPlaybackEvents(
  events: PlaybackEventInput[],
  userId: string | null
): Promise<number> {
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(playbackEvents)
      .values(events.map((event) => ({ ...event, userId })))
      .onConflictDoNothing({ target: playbackEvents.eventId })
      .returning();
    await recordNewPlaybackStarts(tx, inserted.filter((e) => e.eventName === "playback_started"));
    return inserted.length;
  });
}
```

- [ ] **Step 4: Run the complete server gate**

```bash
npx vitest run src/lib/auth/access.test.ts src/lib/s3/client.test.ts src/lib/playback src/app/api/playback src/app/api/tracks/[id]/audio/route.test.ts src/app/api/admin/artwork/process/route.test.ts
npx tsc --noEmit
npx eslint src/lib/playback src/app/api/playback src/app/api/tracks/[id]/audio/route.ts src/app/api/admin/artwork/process/route.ts
npm run build
```

Record command output and migration rehearsal steps in `docs/release/native-playback/server-gate.md`. Keep `native_playback_enabled=false` in production.

- [ ] **Step 5: Apply migration in non-production and smoke the API**

```bash
npm run db:migrate
curl -i "http://localhost:3333/api/playback/settings?installationId=test-ios&platform=ios&appVersion=1.0.4&protocolVersion=1"
curl -i -X POST "http://localhost:3333/api/playback/resolve" -H "Content-Type: application/json" --data '{"trackId":"sands-01"}'
```

The seeded `sands-01` track is the local smoke-test fixture. The expected visitor response is a 200 preview resolution whose URL targets `/api/playback/preview/` and contains no cookie or full CloudFront URL.

- [ ] **Step 6: Commit Gate A evidence**

Mark Gate A complete in the roadmap, update the ledger to `NP-WEB-01`, then:

```bash
git add src/lib/db/schema.ts drizzle src/lib/playback/server/telemetry.ts src/lib/playback/server/telemetry.test.ts src/app/api/playback/events docs/release/native-playback/server-gate.md docs/superpowers/plans/2026-08-21-native-playback-01-server-media-foundation.md docs/superpowers/plans/2026-08-21-native-playback-roadmap.md docs/superpowers/plans/2026-08-21-native-playback-status.md
git commit -m "feat(playback): record safe playback telemetry"
```
