# One Free Full Listen + Subscribe-Page Routing — Design

**Date:** 2026-07-17
**Status:** Approved for planning

## Problem

Two related gaps in the free-tier conversion flow:

1. **"Create Free Account" CTAs jump straight to the signup form.** Several visitor CTAs push directly to `/auth/register`, so a prospective user never sees that a paid plan exists. We want them routed to `/subscribe` (which shows both plans) so people at least have the option to buy — important on web especially, where we control checkout.

2. **The free tier doesn't do what we want to advertise.** We want to tell free users they get "one free listen to every song." Verification found this feature exists in **no branch** — current free behavior is: full-length only for the Sacred 7, 1-minute previews for everything else. So the feature must be built before the copy can be true.

## Current behavior (verified)

The single gate is `canPlayFullTrack(tier, trackId, sacred7TrackIds)` in `src/lib/auth/access.ts`, identical across every local and remote branch:

- `paid` → full length, always
- `free` → full length **only** for Sacred 7 track IDs
- `free`, non-Sacred-7 → 1-minute preview (`getPreviewDuration` = 60s)
- `visitor` → 30-second preview

Playback pipeline:

- **Server** (page/API data) sets each track's `audioUrl` = `/api/tracks/:id/audio` and the preview flags the client uses.
- **`/api/tracks/:id/audio`** is the enforcement point. Entitled → sign a short-lived CloudFront URL and **302 redirect** to it (the whole track then streams from the CDN; our route is hit **once** per full playback). Not entitled → stream a byte-capped ~60s preview (handles HTTP Range, so it is hit multiple times).
- **Client** (`src/lib/hooks/useAudioPlayer.ts`) enforces the preview cutoff visually: at the checkpoint it fades out, plays a jingle, and opens the upgrade modal (the conversion moment).
- **`/api/tracks/:id/play`** fires on load and increments a per-user counter in `user_track_plays` — **analytics only**, not gating.

Every code path that sets `currentTrack` also sets `isPlaying: true` (no "select without play"), so a request to `/audio` is effectively "pressed play."

## Product decisions (locked)

- **Who:** registered free users only. Anonymous visitors keep the 30-second preview (can't be tracked server-side without an account; also a signup incentive).
- **Reset:** once per song, forever. No periodic refresh.
- **Consume trigger:** on press-play — i.e. when the full URL is granted. Accepted tradeoff: an accidental play burns that song's free listen.
- **Scope of "every song":** every non-Sacred-7 track that has audio. Sacred 7 stay unlimited-full.

## Design

### A. Data model

Add one nullable column to the existing `user_track_plays` table (already one row per user+track, unique index on `(user_id, track_id)`):

```
freeListenConsumedAt: timestamp (nullable)
```

Entitlement for a free user on a non-Sacred-7 track: **available** while `freeListenConsumedAt IS NULL`, **consumed** once set. Kept separate from the `play_count` analytics counter on purpose (see Rejected alternatives).

### B. Enforcement — server-authoritative, in `/api/tracks/:id/audio`

For a free user on a non-Sacred-7 track, perform an **atomic claim** before serving:

1. Set `freeListenConsumedAt = now()` **where it is currently NULL** (upsert against the unique index), returning whether this request performed the set.
2. Claim won, or the row was already NULL and we set it → sign the full CloudFront URL; if signing succeeds, 302 to it. (Sign first, then claim, so a signing failure doesn't burn the listen.)
3. Already consumed → serve the existing byte-capped preview.

Because the full path is one redirect per playback, this consumes **exactly once** per full play. Paid and Sacred-7 paths are unchanged. The analytics `/play` counter is untouched.

`canPlayFullTrack` (or a thin wrapper) is extended to factor in "free listen available" so the same rule can be reused by server page/API data (Section C). Signature/shape to be finalized in the plan; it must take the per-user consumption state for the track(s).

### C. Client preview-UX sync

Server page/API data that builds tracks must compute full-vs-preview using consumption, so a free user sees a non-Sacred-7 track as **full when available** (no checkpoint) and **preview when consumed** (checkpoint + jingle + upgrade modal). Result: the upgrade prompt fires on the **second** listen, not the first.

Places that build track lists and set `isFull`/preview flags: `src/app/(app)/page.tsx`, `src/app/(app)/collection/[id]/page.tsx`, `src/app/api/tracks/route.ts`, `src/app/api/tracks/batch/route.ts`, `src/app/api/tracks/[id]/route.ts`, `src/app/api/collections/[id]/route.ts` (and any other `canPlayFullTrack` caller). These already fetch per-user play data via `getUserPlayCounts` in some cases; they will additionally read `freeListenConsumedAt`.

**Same-session replay edge:** replaying a song without navigating leaves page data stale ("full"), so `/audio` would serve a preview while the client isn't in preview mode → audio stops silently ~70s in with no upgrade prompt. Mitigation: after a track's first play the client marks it preview-on-replay, using the `/play` response as a hint (server `/audio` stays authoritative). Keep this minimal.

### D. CTA routing → `/subscribe`

Reroute visitor "Create Free Account" CTAs that currently go to `/auth/register`:

- `src/components/player/PersistentCTA.tsx` (mobile visitor `handleCreateAccount`): `/auth/register` → `/subscribe`
- `src/components/promo/PromoPlayer.tsx` ("Create free account" link): `/auth/register` → `/subscribe`

Leave unchanged:

- `/auth/signin` "Create Free Account" link → `/auth/register` (user is mid-auth, expects the form)
- `/subscribe` free card "Get Started" → `/auth/register` (already on the plan page)
- `DesktopVisitorBanner.tsx` and `UpgradeModal.tsx` visitor CTAs (already → `/subscribe`)

`/subscribe` already renders a native-app-compliant screen (no Stripe pricing, external handoff via `isNativeApp()`), so rerouting is safe on Apple/Google devices.

### E. Copy — free-tier benefits

Update every free-tier benefit list to describe the real behavior. Draft (wording tweakable):

> 7 free full-length hymns · **One full free listen of every song** · 1-minute previews after that · Save favorites

Locations:

- `src/app/subscribe/page.tsx` — `freeFeatures` (line ~72)
- `src/components/desktop/DesktopVideoPanel.tsx` — `FREE_FEATURES` (line ~27), the "Free Account Includes" card on the web home page
- `src/components/layout/DesktopVisitorBanner.tsx` — visitor copy (line ~68)
- `src/components/subscription/UpgradeModal.tsx` — visitor copy (line ~88)

## Rejected alternatives

- **Reuse `play_count >= 1` as "consumed":** no schema change, but couples the entitlement gate to a client-fired analytics counter. A user who blocks the `/play` request keeps count at 0 and gets unlimited full plays. Exploitable → rejected.
- **Separate `user_free_listens` table:** clean separation, but a new table for a single timestamp at a grain `user_track_plays` already has. Over-built → rejected.
- **Consume "only past the preview point" (client progress callback):** friendlier to accidental clicks, but easier to game and needs a client callback. Rejected in favor of consume-on-grant.

## Out of scope

- No end-of-full-listen upgrade modal (the existing preview-end modal on the second listen is the conversion prompt).
- No periodic reset / re-grant of free listens.
- Anonymous-visitor free listens.
- Rerouting the `/auth/signin` signup link (can revisit).

## Success criteria

1. A registered free user plays a non-Sacred-7 song for the first time → hears it in full (no jingle/cutoff).
2. The same user replays that song → gets the 1-minute preview + jingle + upgrade modal.
3. Sacred 7 remain unlimited-full for free users; visitors still get 30s; paid unchanged.
4. Blocking the `/play` request does not grant extra full listens (enforcement is in `/audio`).
5. Visitor "Create Free Account" CTAs in `PersistentCTA` and `PromoPlayer` land on `/subscribe`.
6. Free-tier benefit copy in all four locations reflects the one-free-listen behavior.
