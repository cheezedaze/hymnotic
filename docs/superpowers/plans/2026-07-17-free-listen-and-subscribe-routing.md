# One Free Full Listen + Subscribe-Page Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give registered free users one full-length listen of every non-Sacred-7 song (then revert to the 1-minute preview), route visitor "Create Free Account" CTAs to `/subscribe`, and update free-tier copy to match.

**Architecture:** A nullable `freeListenConsumedAt` timestamp on `user_track_plays` records consumption. `/api/tracks/:id/audio` is the server-authoritative gate — it atomically *claims* the free listen when it hands out the full CDN URL (the full path is one redirect per playback, so it consumes exactly once). Server page/API data mirrors the same rule so the client shows the full track (no cutoff) on the first listen and the preview + upgrade modal on the second. A small in-memory Set in the player store keeps same-session replays honest.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM 0.45 (Postgres, `db:push`), Zustand player store, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-17-free-listen-and-subscribe-routing-design.md`

**Test accounts:** free `testuser@hymnz.com` / `TestPass123`; premium `premium@hymnz.com` / `TestPass123`. Dev server: `npm run dev` → http://localhost:3333.

**Testing reality:** The repo's only Vitest test is `src/lib/s3/client.test.ts` (pure unit); there is no DB/route test harness. So TDD applies to the one pure function (`canPlayFullTrack`); DB helpers, the route, server data, and client are verified by typecheck/lint/build + a scripted browser walkthrough (Task 9). Don't scaffold a DB test harness for this plan.

---

## File structure

- **Modify** `src/lib/db/schema.ts` — add `freeListenConsumedAt` column to `userTrackPlays`.
- **Modify** `src/lib/db/queries.ts` — add `claimFreeListen`, `getConsumedFreeListenTrackIds`; make `incrementUserPlayCount` an atomic upsert.
- **Modify** `src/lib/auth/access.ts` — extend `canPlayFullTrack` with a `freeListenAvailable` param.
- **Create** `src/lib/auth/access.test.ts` — unit tests for the extended gate.
- **Modify** `src/app/api/tracks/[id]/audio/route.ts` — free-listen claim path.
- **Modify** `src/app/(app)/page.tsx`, `src/app/(app)/collection/[id]/page.tsx`, `src/app/api/tracks/route.ts`, `src/app/api/collections/[id]/route.ts` — compute the gate with consumption and emit `isFreeListen`.
- **Modify** `src/lib/types.ts` — add `isFreeListen?: boolean` to `ApiTrack`.
- **Modify** `src/lib/store/playerStore.ts` — `freeListenPlayed` Set + `markFreeListenPlayed`; consult it in `previewStateForTrack`.
- **Modify** `src/lib/hooks/useAudioPlayer.ts` — mark a track's free listen played on first play.
- **Modify** `src/components/player/PersistentCTA.tsx`, `src/components/promo/PromoPlayer.tsx` — reroute CTAs to `/subscribe`.
- **Modify** `src/app/subscribe/page.tsx`, `src/components/desktop/DesktopVideoPanel.tsx`, `src/components/layout/DesktopVisitorBanner.tsx`, `src/components/subscription/UpgradeModal.tsx` — copy.

**Left unchanged (noted, not a regression):** `src/app/api/tracks/batch/route.ts` and `src/app/api/tracks/[id]/route.ts` don't compute `isLocked` today (no client-side gate; `/audio` is the backstop). Adding access context there is out of scope. Tracks reached only through those routes show as "full" client-side but are still gated by `/audio`; the same-session Set (Task 6) covers replays of tracks played this session.

---

## Task 1: Schema — add `freeListenConsumedAt`

**Files:**
- Modify: `src/lib/db/schema.ts:306-318`

- [ ] **Step 1: Add the column**

In `src/lib/db/schema.ts`, inside the `userTrackPlays` table definition, add the column after `lastPlayedAt`:

```ts
    playCount: integer("play_count").default(0).notNull(),
    lastPlayedAt: timestamp("last_played_at").defaultNow().notNull(),
    // Set once when a free user consumes their one full listen of this track.
    // NULL = free listen still available. Sacred 7 / paid never use this.
    freeListenConsumedAt: timestamp("free_listen_consumed_at"),
```

- [ ] **Step 2: Push the schema**

Run: `npm run db:push`
Expected: drizzle-kit reports adding column `free_listen_consumed_at` to `user_track_plays` and completes without data loss (additive nullable column). If it prompts, choose the non-destructive "add column" option.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(db): add free_listen_consumed_at to user_track_plays"
```

---

## Task 2: DB queries — claim, read, and race-safe increment

**Files:**
- Modify: `src/lib/db/queries.ts:665-694` (`incrementUserPlayCount`) and add two functions after `getUserPlayCounts` (line ~715)

`queries.ts` already imports what we need: `import { eq, asc, desc, sql, inArray, and, isNotNull, gte } from "drizzle-orm";`

- [ ] **Step 1: Make `incrementUserPlayCount` an atomic upsert**

This function now races with `claimFreeListen` (both write the same `(user, track)` row on first play). Replace the select-then-insert body (lines 665-694) with a single upsert:

```ts
export async function incrementUserPlayCount(userId: string, trackId: string) {
  const [row] = await db
    .insert(userTrackPlays)
    .values({ userId, trackId, playCount: 1 })
    .onConflictDoUpdate({
      target: [userTrackPlays.userId, userTrackPlays.trackId],
      set: {
        playCount: sql`${userTrackPlays.playCount} + 1`,
        lastPlayedAt: new Date(),
      },
    })
    .returning();
  return row;
}
```

- [ ] **Step 2: Add `claimFreeListen` and `getConsumedFreeListenTrackIds`**

Add after `getUserPlayCounts` (line ~715):

```ts
/**
 * Atomically claim a free user's one full listen for a track.
 * Sets free_listen_consumed_at only if it is currently NULL.
 * Returns true if THIS call consumed the listen (i.e. it was available),
 * false if it was already consumed. Safe to call concurrently.
 */
export async function claimFreeListen(
  userId: string,
  trackId: string
): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .insert(userTrackPlays)
    .values({ userId, trackId, freeListenConsumedAt: now })
    .onConflictDoUpdate({
      target: [userTrackPlays.userId, userTrackPlays.trackId],
      set: { freeListenConsumedAt: now },
      setWhere: sql`${userTrackPlays.freeListenConsumedAt} IS NULL`,
    })
    .returning({ id: userTrackPlays.id });
  return rows.length > 0;
}

/**
 * Track IDs (optionally filtered to `trackIds`) whose free listen this user
 * has already consumed. Used by server data to mark tracks preview vs full.
 */
export async function getConsumedFreeListenTrackIds(
  userId: string,
  trackIds?: string[]
): Promise<string[]> {
  if (trackIds && trackIds.length === 0) return [];
  const rows = await db
    .select({ trackId: userTrackPlays.trackId })
    .from(userTrackPlays)
    .where(
      and(
        eq(userTrackPlays.userId, userId),
        isNotNull(userTrackPlays.freeListenConsumedAt),
        ...(trackIds ? [inArray(userTrackPlays.trackId, trackIds)] : [])
      )
    );
  return rows.map((r) => r.trackId);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (confirms `setWhere` exists in drizzle 0.45 and the upsert typechecks).

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/queries.ts
git commit -m "feat(db): claimFreeListen + consumed-track query; atomic play-count upsert"
```

---

## Task 3: Entitlement — extend `canPlayFullTrack` (TDD)

**Files:**
- Modify: `src/lib/auth/access.ts:40-48`
- Create: `src/lib/auth/access.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth/access.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canPlayFullTrack } from "./access";

const SACRED7 = ["s1", "s2"];

describe("canPlayFullTrack", () => {
  it("paid users always get full", () => {
    expect(canPlayFullTrack("paid", "x", SACRED7)).toBe(true);
    expect(canPlayFullTrack("paid", "s1", SACRED7)).toBe(true);
  });

  it("free users get full for Sacred 7 regardless of free-listen state", () => {
    expect(canPlayFullTrack("free", "s1", SACRED7, false)).toBe(true);
  });

  it("free users get full for a non-Sacred-7 track when the free listen is available", () => {
    expect(canPlayFullTrack("free", "x", SACRED7, true)).toBe(true);
  });

  it("free users get preview for a non-Sacred-7 track once the free listen is consumed", () => {
    expect(canPlayFullTrack("free", "x", SACRED7, false)).toBe(false);
  });

  it("defaults to no free listen when the flag is omitted (back-compat)", () => {
    expect(canPlayFullTrack("free", "x", SACRED7)).toBe(false);
  });

  it("visitors never get full", () => {
    expect(canPlayFullTrack("visitor", "x", SACRED7, true)).toBe(false);
    expect(canPlayFullTrack("visitor", "s1", SACRED7, true)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/auth/access.test.ts`
Expected: FAIL — the "free listen available" case returns `false` because the current signature ignores the 4th argument.

- [ ] **Step 3: Extend the function**

In `src/lib/auth/access.ts`, replace `canPlayFullTrack` (lines 40-48):

```ts
export function canPlayFullTrack(
  tier: UserTier,
  trackId: string,
  sacred7TrackIds: string[],
  freeListenAvailable = false
): boolean {
  if (tier === "paid") return true;
  if (tier === "free" && sacred7TrackIds.includes(trackId)) return true;
  if (tier === "free" && freeListenAvailable) return true;
  return false;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/lib/auth/access.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/access.ts src/lib/auth/access.test.ts
git commit -m "feat(access): canPlayFullTrack honors one-time free listen"
```

---

## Task 4: `/audio` route — the free-listen claim path

**Files:**
- Modify: `src/app/api/tracks/[id]/audio/route.ts:1-53`

- [ ] **Step 1: Import the claim query**

At the top of the file, add to the existing import from queries:

```ts
import { getTrackById } from "@/lib/db/queries";
```

Change it to:

```ts
import { getTrackById, claimFreeListen } from "@/lib/db/queries";
```

- [ ] **Step 2: Replace the entitlement block**

Replace lines 41-53 (from `const access = await getAccessContext();` through the `if (full) { ... }` block) with:

```ts
    const access = await getAccessContext();
    const sacred7 = await getSacred7TrackIds();
    const baseFull = canPlayFullTrack(access.tier, id, sacred7); // paid or free+Sacred 7

    // Paid / Sacred 7 → full, no consumption.
    if (baseFull) {
      const url = signAudioUrl(track.audioKey);
      if (!url) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.redirect(url, 302);
    }

    // Free user, non-Sacred-7 → grant the one-time full listen if still available.
    // Sign first so a signing failure doesn't burn the listen, then claim
    // atomically. The full path is one redirect per playback, so this consumes
    // exactly once. A lost claim (already consumed) falls through to preview.
    if (access.tier === "free" && access.userId && !sacred7.includes(id)) {
      const url = signAudioUrl(track.audioKey);
      if (url && (await claimFreeListen(access.userId, id))) {
        return NextResponse.redirect(url, 302);
      }
    }
```

The existing preview block (`const previewSec = getPreviewDuration(access.tier); ...` onward) stays unchanged and now handles visitors **and** free users who've consumed their listen.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/tracks/[id]/audio/route.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/tracks/[id]/audio/route.ts"
git commit -m "feat(audio): grant free users one full listen per non-Sacred-7 track"
```

---

## Task 5: Server data — compute the gate with consumption + emit `isFreeListen`

**Files:**
- Modify: `src/lib/types.ts` (add `isFreeListen?: boolean` to `ApiTrack`, near line 48-51)
- Modify: `src/app/(app)/page.tsx:40-64`
- Modify: `src/app/(app)/collection/[id]/page.tsx:112-122`
- Modify: `src/app/api/tracks/route.ts:24-27, 56-76, 96-124`
- Modify: `src/app/api/collections/[id]/route.ts:24-27, 58-73`

`isFreeListen` is set true only for a free user's non-Sacred-7 track whose listen is still available. The client uses it to remember which tracks to flip to preview on same-session replay (Task 6). Sacred 7 and paid never set it.

- [ ] **Step 1: Add the type field**

In `src/lib/types.ts`, add to the `ApiTrack` interface next to `isLocked` / `previewDuration`:

```ts
  isLocked?: boolean;
  previewDuration?: number;
  isSacred7?: boolean;
  isFeatured?: boolean;
  isFreeListen?: boolean;
```

- [ ] **Step 2: Home page (`src/app/(app)/page.tsx`)**

Add the query import (top of file, alongside other `@/lib/db/queries` imports):

```ts
import { getConsumedFreeListenTrackIds } from "@/lib/db/queries";
```

Replace the `if (featuredItem) { ... }` body (lines 40-66) so it fetches the consumed set once for the featured track + its queue and applies the rule to both:

```ts
  if (featuredItem) {
    const track = await getTrackById(featuredItem.referenceId);
    if (track) {
      const collection = await getCollectionById(track.collectionId);
      const collectionArtworkKey = collection?.artworkKey ?? null;
      const queueTracks = await getTracksByCollection(track.collectionId);

      // Which of these tracks has this free user already used their listen on?
      const consumed =
        access.tier === "free" && access.userId
          ? new Set(
              await getConsumedFreeListenTrackIds(
                access.userId,
                [track.id, ...queueTracks.map((t) => t.id)]
              )
            )
          : new Set<string>();

      const avail = (tid: string) =>
        access.tier === "free" &&
        !sacred7TrackIds.includes(tid) &&
        !consumed.has(tid);

      const featuredFull = canPlayFullTrack(
        access.tier,
        track.id,
        sacred7TrackIds,
        avail(track.id)
      );
      featuredTrack = {
        ...track,
        ...buildTrackMediaUrlsWithFallback(track, collectionArtworkKey),
        audioUrl: track.audioKey ? `/api/tracks/${track.id}/audio` : null,
        isLocked: !featuredFull,
        previewDuration: featuredFull ? track.duration : previewDur,
        isFreeListen: avail(track.id),
        isFeatured: true,
      };

      featuredQueue = queueTracks.map((t) => {
        const tFull = canPlayFullTrack(
          access.tier,
          t.id,
          sacred7TrackIds,
          avail(t.id)
        );
        return {
          ...t,
          ...buildTrackMediaUrlsWithFallback(t, collectionArtworkKey),
          audioUrl: t.audioKey ? `/api/tracks/${t.id}/audio` : null,
          isLocked: !tFull,
          previewDuration: tFull ? t.duration : previewDur,
          isFreeListen: avail(t.id),
        };
      });
    }
  }
```

> Note: this changes the featured hero for **free** users from "always full" to the free-listen rule (Sacred 7 unlimited, others once). Paid/visitor unchanged. This is intentional consistency with `/audio`, which gates the hero the same way.

- [ ] **Step 3: Collection page (`src/app/(app)/collection/[id]/page.tsx`)**

Add the import:

```ts
import { getConsumedFreeListenTrackIds } from "@/lib/db/queries";
```

Replace the `const tracks = rawTracks.map(...)` block (lines 112-122) with a consumed-set version:

```ts
  const consumed =
    access.tier === "free" && access.userId
      ? new Set(
          await getConsumedFreeListenTrackIds(
            access.userId,
            rawTracks.map((t) => t.id)
          )
        )
      : new Set<string>();

  const tracks = rawTracks.map((t) => {
    const freeListenAvailable =
      access.tier === "free" &&
      !sacred7TrackIds.includes(t.id) &&
      !consumed.has(t.id);
    const isFull = canPlayFullTrack(
      access.tier,
      t.id,
      sacred7TrackIds,
      freeListenAvailable
    );
    return {
      ...t,
      ...buildTrackMediaUrlsWithFallback(t, collection.artworkKey),
      audioUrl: t.audioKey ? `/api/tracks/${t.id}/audio` : null,
      isLocked: !isFull,
      previewDuration: isFull ? t.duration : previewDuration,
      isSacred7: sacred7TrackIds.includes(t.id),
      isFreeListen: freeListenAvailable,
    };
  });
```

- [ ] **Step 4: `src/app/api/tracks/route.ts` — both map blocks**

Add `getConsumedFreeListenTrackIds` to the existing `@/lib/db/queries` import (line ~6, next to `getUserPlayCounts`).

For the **first** block (lines ~46-76), after the `userPlays` fetch, add the consumed set and apply it. Replace lines 56-75 (`const tracksWithUrls = allTracks.map(...)`) with:

```ts
      const consumed =
        access.tier === "free" && userId
          ? new Set(
              await getConsumedFreeListenTrackIds(
                userId,
                allTracks.map((t) => t.id)
              )
            )
          : new Set<string>();

      const tracksWithUrls = allTracks.map((track) => {
        const freeListenAvailable =
          access.tier === "free" &&
          !sacred7TrackIds.includes(track.id) &&
          !consumed.has(track.id);
        const isFull = canPlayFullTrack(
          access.tier,
          track.id,
          sacred7TrackIds,
          freeListenAvailable
        );
```

...and add `isFreeListen: freeListenAvailable,` to the returned object right after `previewDuration: isFull ? track.duration : previewDuration,` (line ~75). Leave the rest of the object literal intact.

For the **second** block (lines ~96-124), do the same: after the `userPlays` fetch, replace `const tracksWithUrls = collectionTracks.map((track) => {` and its `const isFull = ...` with:

```ts
    const consumedC =
      access.tier === "free" && userId
        ? new Set(
            await getConsumedFreeListenTrackIds(
              userId,
              collectionTracks.map((t) => t.id)
            )
          )
        : new Set<string>();

    const tracksWithUrls = collectionTracks.map((track) => {
      const freeListenAvailable =
        access.tier === "free" &&
        !sacred7TrackIds.includes(track.id) &&
        !consumedC.has(track.id);
      const isFull = canPlayFullTrack(
        access.tier,
        track.id,
        sacred7TrackIds,
        freeListenAvailable
      );
```

...and add `isFreeListen: freeListenAvailable,` after `previewDuration: isFull ? track.duration : previewDuration,` (line ~124). (Different variable name `consumedC` avoids a redeclare clash with the first block in the same function scope.)

- [ ] **Step 5: `src/app/api/collections/[id]/route.ts`**

Add `getConsumedFreeListenTrackIds` to the `@/lib/db/queries` import (line 2). After the `userPlays` fetch (line ~40-47), replace the `tracks: collection.tracks.map((track) => {` block start + `const isFull = ...` (lines 58-59) with:

```ts
      const consumed =
        access.tier === "free" && userId
          ? new Set(
              await getConsumedFreeListenTrackIds(
                userId,
                collection.tracks.map((t) => t.id)
              )
            )
          : new Set<string>();
```

(Place the `const consumed = ...` **above** the returned object, not inside `.map`.) Then inside the map:

```ts
      tracks: collection.tracks.map((track) => {
        const freeListenAvailable =
          access.tier === "free" &&
          !sacred7TrackIds.includes(track.id) &&
          !consumed.has(track.id);
        const isFull = canPlayFullTrack(
          access.tier,
          track.id,
          sacred7TrackIds,
          freeListenAvailable
        );
```

...and add `isFreeListen: freeListenAvailable,` after `previewDuration: isFull ? track.duration : previewDuration,` (line ~73).

> Since `consumed` must be computed before the returned object literal, you may need to hoist it above the `return NextResponse.json({ ... })`. Read the surrounding lines and place the `const consumed` right after the `userPlayMap` construction.

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/\(app\)/page.tsx "src/app/(app)/collection/[id]/page.tsx" src/app/api/tracks/route.ts "src/app/api/collections/[id]/route.ts" src/lib/types.ts`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/app/\(app\)/page.tsx "src/app/(app)/collection/[id]/page.tsx" src/app/api/tracks/route.ts "src/app/api/collections/[id]/route.ts"
git commit -m "feat(access): server data marks free listen available/consumed per track"
```

---

## Task 6: Client — keep same-session replays honest

**Files:**
- Modify: `src/lib/store/playerStore.ts` (state + action + `previewStateForTrack` + its 9 call sites)
- Modify: `src/lib/hooks/useAudioPlayer.ts:196-201`

- [ ] **Step 1: Add a free-preview constant + the helper's new signature**

In `src/lib/store/playerStore.ts`, add a constant above `previewStateForTrack` (line ~75) and rewrite the helper to consult a played-set. Mirrors `getPreviewDuration("free")` in `access.ts`.

```ts
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
```

- [ ] **Step 2: Add state + action to the interface and store**

In the `PlayerState` interface, add after `history: ApiTrack[];` (line ~28):

```ts
  // Track IDs the user consumed their one free full listen on THIS session.
  // In-memory only (not persisted) — a reload refetches authoritative server data.
  freeListenPlayed: string[];
```

And in the actions section of the interface (near line ~72):

```ts
  markFreeListenPlayed: (trackId: string) => void;
```

In the store body, add the initial value next to `history: []` (search for `history: [],` in the initial state object, ~line 123):

```ts
      freeListenPlayed: [],
```

And add the action implementation next to the other setters (e.g. after `setShowPreviewActions`, ~line 534):

```ts
      markFreeListenPlayed: (trackId) =>
        set((s) =>
          s.freeListenPlayed.includes(trackId)
            ? s
            : { freeListenPlayed: [...s.freeListenPlayed, trackId] }
        ),
```

Do **not** add `freeListenPlayed` to `partialize` (lines 555-561) — it must stay session-only.

- [ ] **Step 3: Pass the played-set at every `previewStateForTrack` call**

There are 9 call sites (lines ~225, 265, 314, 349, 364, 390, 442, 508). Each is inside a store action where `get()` is in scope. Change every `...previewStateForTrack(X)` to `...previewStateForTrack(X, get().freeListenPlayed)`. For example:

```ts
              ...previewStateForTrack(nextTrack, get().freeListenPlayed),
```

Apply the same edit to all 9 (the argument name varies: `nextTrack`, `prevTrack`, `startTrack`, `track`).

- [ ] **Step 4: Mark the listen played on first play**

In `src/lib/hooks/useAudioPlayer.ts`, the track-load effect fires `/play` at lines 196-201. Right after that block, add:

```ts
      // Increment play count (skip for visitors — avoids 401 console noise)
      if (useSubscriptionStore.getState().effectiveTier() !== "visitor") {
        fetch(`/api/tracks/${currentTrack.id}/play`, { method: "POST" }).catch(
          () => {}
        );
      }

      // If this play is the free user's one full listen for the track, remember
      // it so a same-session replay shows the 60s preview + upgrade modal.
      if (currentTrack.isFreeListen) {
        usePlayerStore.getState().markFreeListenPlayed(currentTrack.id);
      }
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/store/playerStore.ts src/lib/hooks/useAudioPlayer.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/store/playerStore.ts src/lib/hooks/useAudioPlayer.ts
git commit -m "feat(player): same-session replay of a used free listen shows preview + modal"
```

---

## Task 7: CTA routing → `/subscribe`

**Files:**
- Modify: `src/components/player/PersistentCTA.tsx:24-27`
- Modify: `src/components/promo/PromoPlayer.tsx:184-189`

- [ ] **Step 1: `PersistentCTA` visitor button**

Change `handleCreateAccount` (lines 24-27) to route to `/subscribe`:

```ts
    const handleCreateAccount = () => {
      minimizeNowPlaying();
      router.push("/subscribe");
    };
```

(Leave the button label "Create Free Account" — `/subscribe` shows the free plan prominently plus the paid option.)

- [ ] **Step 2: `PromoPlayer` CTA link**

Change the `<Link href="/auth/register">` (line ~185) to:

```tsx
          <Link
            href="/subscribe"
            className="inline-block mt-3 px-6 py-2.5 rounded-full bg-accent text-midnight text-sm font-semibold glow-accent"
          >
            Create free account
          </Link>
```

(Leave the adjacent "Sign in" link untouched.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/components/player/PersistentCTA.tsx src/components/promo/PromoPlayer.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/player/PersistentCTA.tsx src/components/promo/PromoPlayer.tsx
git commit -m "feat(cta): route visitor Create-Free-Account CTAs to /subscribe"
```

---

## Task 8: Copy — free-tier benefits

**Files:**
- Modify: `src/app/subscribe/page.tsx:72-77`
- Modify: `src/components/desktop/DesktopVideoPanel.tsx:27-32`
- Modify: `src/components/layout/DesktopVisitorBanner.tsx:68-71`
- Modify: `src/components/subscription/UpgradeModal.tsx:88-90`

Honest wording: Sacred 7 are full; every other song gets one full listen, then 1-minute previews.

- [ ] **Step 1: Subscribe page free features**

Replace the `freeFeatures` array (lines 72-77):

```ts
  const freeFeatures = [
    "7 free full-length hymns",
    "One full free listen of every song",
    "1-minute previews after that",
    "Save favorites",
  ];
```

- [ ] **Step 2: Home-page "Free Account Includes" card**

Replace `FREE_FEATURES` in `src/components/desktop/DesktopVideoPanel.tsx` (lines 27-32):

```ts
const FREE_FEATURES = [
  "7 full-length hymns",
  "One full free listen of every song",
  "1-minute previews after that",
  "Save favorites",
];
```

- [ ] **Step 3: Visitor banner copy**

In `src/components/layout/DesktopVisitorBanner.tsx`, update the visitor description (lines 68-71). Current text: "Get a FREE HYMNZ account to unlock longer previews and 7 free songs. No Credit Card Required." Replace with:

```tsx
          Get a FREE HYMNZ account to unlock 7 free songs plus one full
          listen of every other song. No Credit Card Required.
```

(Keep the surrounding JSX/markup; only change the sentence text.)

- [ ] **Step 4: Upgrade modal visitor copy**

In `src/components/subscription/UpgradeModal.tsx` (line ~88-90), replace the visitor-branch string:

```ts
                ? "Unlock 7 free songs plus one full listen of every song, longer previews, and more. (Full-access subscription also available)"
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/subscribe/page.tsx src/components/desktop/DesktopVideoPanel.tsx src/components/layout/DesktopVisitorBanner.tsx src/components/subscription/UpgradeModal.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/subscribe/page.tsx src/components/desktop/DesktopVideoPanel.tsx src/components/layout/DesktopVisitorBanner.tsx src/components/subscription/UpgradeModal.tsx
git commit -m "copy: describe one free full listen in free-tier benefit lists"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Static checks**

Run: `npx tsc --noEmit && npx eslint . && npm run test`
Expected: no type errors, no lint errors, Vitest passes (including the new `access.test.ts`).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Browser walkthrough (free user)**

Start `npm run dev` (port 3333) and use the Browser pane. Sign in as `testuser@hymnz.com` / `TestPass123`. Pick a **non-Sacred-7** track (a collection track that isn't in the Sacred 7). Verify each success criterion:

1. **First listen is full** — play it; it plays past 1:00 with no jingle/cutoff, up to the full duration. (Confirm the `/api/tracks/:id/audio` request returned a 302 to the CDN via `read_network_requests`.)
2. **Second listen is preview** — replay the same track (in the now-playing UI and/or after navigating back). It fades at ~60s, plays the jingle, and opens the upgrade modal.
3. **Sacred 7 unchanged** — a Sacred 7 track plays full every time, no cutoff, on repeat plays.
4. **Server-authoritative** — with the free listen already consumed, reload and play again: still preview (proves the gate is in `/audio`, not the client). Optionally confirm blocking the `POST /play` request does not grant extra full listens.
5. **Visitor unchanged** — sign out; a non-Sacred-7 track cuts off at ~30s.
6. **Paid unchanged** — sign in as `premium@hymnz.com`; everything plays full.

- [ ] **Step 4: CTA + copy spot-check**

- As a signed-out visitor on mobile viewport (`resize_window` mobile), the `PersistentCTA` "Create Free Account" button navigates to `/subscribe` (shows both Free and Premium).
- The promo page ("Create free account") link goes to `/subscribe`.
- `/subscribe` free card, the home-page "Free Account Includes" card, the desktop visitor banner, and the visitor upgrade modal all show the "one full free listen of every song" wording.

- [ ] **Step 5: Screenshot proof**

Capture a screenshot of (a) the upgrade modal firing on the second listen and (b) `/subscribe` reached from a rerouted CTA. Share with the user.

---

## Self-review notes (author)

- **Spec coverage:** A (schema)→T1; B (enforcement in `/audio`, atomic claim)→T4 + T2; C (server data + client sync)→T5 + T6; D (CTA routing)→T7; E (copy)→T8. Success criteria 1-6→T9. All covered.
- **Type consistency:** `canPlayFullTrack(tier, trackId, sacred7, freeListenAvailable?)`, `claimFreeListen(userId, trackId): Promise<boolean>`, `getConsumedFreeListenTrackIds(userId, trackIds?): Promise<string[]>`, `ApiTrack.isFreeListen?`, `markFreeListenPlayed(trackId)`, `freeListenPlayed: string[]` — names used consistently across tasks.
- **Known limitations (accepted):** `batch`/`[id]` routes stay ungated client-side (backstopped by `/audio`); an accidental play burns a song's free listen (product decision); the featured hero becomes free-listen-gated for free users (intentional consistency).
