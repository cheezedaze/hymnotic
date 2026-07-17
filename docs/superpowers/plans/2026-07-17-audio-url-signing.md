# Audio URL Signing (CloudFront Signed URLs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HYMNZ track audio (`audio/tracks/*`) fetchable only via short-lived CloudFront signed URLs, so the MP3s can no longer be scraped from page source or replayed from a copied CDN link — while keeping legit playback working for free/paid/promo/admin listeners.

**Architecture:** Restrict the `audio/tracks/*` path on the existing CloudFront distribution to a **trusted key group** (signed URLs required). Direct S3 access is already denied (verified: S3 returns 403, only CloudFront serves the files), so CloudFront is the sole public door — locking it closes the vector. All legit playback flows through server endpoints that mint a fresh signed URL and 302-redirect to it, so a signed URL never sits in HTML/JSON and expires within hours anyway. Three browser consumers of `audio/tracks/*` are routed through signing: the main player (`/api/tracks/[id]/audio`), the promo player (new `/api/promo/audio`), and admin playback (also via `/api/tracks/[id]/audio`, since admin = paid tier). The shared media-URL helper stops emitting raw audio URLs so leaks are impossible by construction, guarded by a test.

**Tech Stack:** Next.js 16 App Router, `@aws-sdk/cloudfront-signer` (new dep), existing CloudFront distribution + S3 (OAC), Vitest, AWS CLI/console for infra.

**Scope (decided):** Audio only. Artwork and video stay public (signing them is mostly cache-cost for little benefit). Lossless masters (`audio/originals/*`) are **out of scope** — they're admin-only and never linked publicly; noted as a follow-up. The "Offline downloads" onboarding bullet is removed (short-lived signed URLs are incompatible with a real offline feature, and none exists in code).

---

## Verified codebase facts (2026-07-17)

- **Direct S3 is already locked:** `curl` of `https://hymnotic-media.s3.us-west-2.amazonaws.com/audio/tracks/...mp3` → **403**; CloudFront (`https://d2y722s9xxtvrs.cloudfront.net/audio/tracks/...mp3`) → **200**. So only CloudFront needs locking.
- Track audio keys are `audio/tracks/*`. Lossless masters `audio/originals/*`. The player jingle is `audio/system/hymnz-jingle.mp3` (`src/lib/hooks/useAudioPlayer.ts:14`) — must stay public, so the signed behavior must target `audio/tracks/*` only, NOT all of `audio/*`.
- `src/lib/s3/client.ts`: `getMediaUrl(key)` (line 41, sync string concat), `getObjectRange` (preview streamer, S3 IAM — unaffected by CloudFront signing), `getPresignedUrl` (S3 GET presigner, currently unused), `buildTrackMediaUrls` (line 104) / `buildTrackMediaUrlsWithFallback` (line 123) emit `audioUrl: getMediaUrl(track.audioKey)` and `originalAudioUrl` — **this is the leak source**.
- Audio gate `src/app/api/tracks/[id]/audio/route.ts`: entitled listeners get a 302 to `getMediaUrl(track.audioKey)` (line 47–51); others get a byte-capped preview via `getObjectRange`. This is the single sign point for entitled full playback.
- Routes that currently emit a **raw** `audioUrl` (must be fixed to the API path): `tracks/route.ts` (already API-path for locked, direct-CDN for full — change to always API path), `tracks/[id]/route.ts:38`, `tracks/batch/route.ts:48`, `collections/[id]/route.ts:75`, admin `admin/tracks/route.ts:55` + `admin/tracks/[id]/route.ts:37`. RSC: `app/(app)/page.tsx` (featured track audio).
- Player: `src/lib/hooks/useAudioPlayer.ts:143` sets `audio.src = currentTrack.audioUrl` and treats a null `audioUrl` as "simulated mode." So `audioUrl` must stay non-null for playable tracks (set to the API path). It already handles the `/api/tracks/:id/audio` path (locked tracks use it today) and has an `error` handler that skips a broken track.
- Admin plays via `useAdminAudioPlayer(audioUrl)` (`src/components/admin/AdminAudioPlayer.tsx:24`, `EditTrack.tsx:97`). Admin audioUrl comes from admin routes' `buildTrackMediaUrls` (raw CDN) → will break on lock unless routed through signing. Admin is `paid` tier (`src/lib/auth/access.ts:21`), so `/api/tracks/[id]/audio` returns a full signed redirect for admins. `originalAudioUrl` is NOT used for admin playback (EditTrack shows only a "WAV stored" label from `originalAudioKey`), so dropping raw `originalAudioUrl` is safe.
- CloudFront cache policy "HymnoticMediaStreaming" (`infrastructure/s3/setup-cloudfront.sh`): whitelists `Range`, `QueryStringBehavior: none`, `CookieBehavior: none`. Signed-URL query params are validated by CloudFront independently of the cache key, so caching still works after locking. Distribution id + key names live in AWS; the CDN host is `d2y722s9xxtvrs.cloudfront.net`.
- No `@aws-sdk/cloudfront-signer` dependency yet. Repo installs with `.npmrc legacy-peer-deps=true`. Tests: `npm test` (Vitest, node env, `src/**/*.test.ts`).

## Signed-URL design constants

- **TTL: 6 hours** (`SIGNED_URL_TTL_SEC = 21600`). Long enough to outlive any single listen + seeking session (so no mid-song 403), short enough that a scraped redirect URL is dead within the day.
- **Env vars:** `CLOUDFRONT_KEY_PAIR_ID` (the CloudFront public-key id), `CLOUDFRONT_PRIVATE_KEY` (PEM, newlines as literal `\n` in the env value). Both server-only (no `NEXT_PUBLIC_`).
- **Local-dev fallback:** if either env var is missing, `signAudioUrl` falls back to `getMediaUrl` (unsigned) so local dev without keys still plays. Prod always has the keys.

---

### Task 1: AWS infrastructure — CloudFront key group + restrict `audio/tracks/*`

**This task is AWS-console/CLI work, not app code.** It has no repo commit except a runbook doc. It is a hard prerequisite for the code to enforce anything, but the CODE can be built and merged first behind the fallback (unsigned until keys exist). Recommended order: build code (Tasks 2–8) on the branch, do this infra task in parallel, and only set the prod env vars + flip the CloudFront restriction at cutover.

**Files:**
- Create: `infrastructure/s3/SIGNED-URLS-RUNBOOK.md` (record exactly what was provisioned: public-key id, key-group id, distribution id, behavior path pattern, and the rollback command)

- [ ] **Step 1: Generate a CloudFront key pair (locally, once)**

```bash
openssl genrsa -out cloudfront_private_key.pem 2048
openssl rsa -pubout -in cloudfront_private_key.pem -out cloudfront_public_key.pem
```
Keep `cloudfront_private_key.pem` OUT of git (it's a secret). Do not commit either file.

- [ ] **Step 2: Upload the public key to CloudFront and create a key group**

```bash
# Upload public key
aws cloudfront create-public-key --public-key-config \
  "Name=hymnz-audio-signing,EncodedKey=$(cat cloudfront_public_key.pem),CallerReference=hymnz-audio-$(date +%s)"
# note the returned Id (e.g. K2XXXX...) → this is CLOUDFRONT_KEY_PAIR_ID

# Create a key group referencing that public key id
aws cloudfront create-key-group --key-group-config \
  "Name=hymnz-audio-key-group,Items=<PUBLIC_KEY_ID>,CallerReference=hymnz-kg-$(date +%s)"
# note the returned key group Id
```

- [ ] **Step 3: Add a restricted cache behavior for `audio/tracks/*`**

In the CloudFront distribution (get its id via `aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='Hymnotic media CDN'].Id"`), add a **new cache behavior**:
- Path pattern: `audio/tracks/*`
- Origin: the existing S3 origin
- Cache policy: the existing "HymnoticMediaStreaming" policy (Range support)
- **Restrict viewer access: YES → Trusted key group → hymnz-audio-key-group**
- Viewer protocol policy: redirect-to-https

Leave the **default behavior and all other path patterns public** (this keeps artwork, video, `audio/system/*` jingle, and `audio/originals/*` working unsigned). Do this via the console (Behaviors tab) or `aws cloudfront get-distribution-config` → edit JSON → `update-distribution`. Record the exact behavior JSON in the runbook.

- [ ] **Step 4: Verify the lock empirically (after the distribution finishes deploying, ~5–10 min)**

```bash
# Unsigned request to a real track key must now FAIL:
curl -s -o /dev/null -w "unsigned: %{http_code}\n" \
  "https://d2y722s9xxtvrs.cloudfront.net/audio/tracks/Master_Carry-Onmixdown-1771529276969.mp3"
# Expected: 403

# Jingle (audio/system) must STILL be public:
curl -s -o /dev/null -w "jingle: %{http_code}\n" \
  "https://d2y722s9xxtvrs.cloudfront.net/audio/system/hymnz-jingle.mp3"
# Expected: 200

# Artwork must STILL be public:
curl -s -o /dev/null -w "artwork: %{http_code}\n" \
  "https://d2y722s9xxtvrs.cloudfront.net/images/artwork/Carry-On-1776374689799.jpg"
# Expected: 200
```

- [ ] **Step 5: Store secrets**

- Vercel (Production + Preview): `CLOUDFRONT_KEY_PAIR_ID=<public key id>`, `CLOUDFRONT_PRIVATE_KEY=<PEM with literal \n>`. Convert the PEM: `awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' cloudfront_private_key.pem` and paste the result as the value.
- `.env.local` (for the developer who will test signing locally): same two vars.
- Then delete the local `.pem` files or move them to a password manager. Never commit them.

- [ ] **Step 6: Write the runbook and commit it**

Record in `infrastructure/s3/SIGNED-URLS-RUNBOOK.md`: public-key id, key-group id, distribution id, the `audio/tracks/*` behavior JSON, how to verify (Step 4 commands), and the **rollback**: "In CloudFront, delete the `audio/tracks/*` behavior (or set Restrict viewer access = No). Files become public again immediately after deploy." Do NOT put the private key or its value in this file.

```bash
git add infrastructure/s3/SIGNED-URLS-RUNBOOK.md
git commit -m "docs(infra): CloudFront signed-URL runbook for audio/tracks"
```

### Task 2: `signAudioUrl` helper + env plumbing (TDD)

**Files:**
- Modify: `src/lib/s3/client.ts` (add `signAudioUrl`)
- Create: `src/lib/s3/client.test.ts`
- Modify: `.env.example` (document the two new vars)
- Modify: `package.json` (add `@aws-sdk/cloudfront-signer`)

- [ ] **Step 1: Install the signer**

```bash
npm install @aws-sdk/cloudfront-signer
```
Verify: `node -e "console.log(require('@aws-sdk/cloudfront-signer/package.json').version)"` prints a version. (`.npmrc` already sets `legacy-peer-deps=true`.)

- [ ] **Step 2: Write the failing test** `src/lib/s3/client.test.ts`

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signAudioUrl } from "./client";

// A throwaway 2048-bit RSA private key generated for tests only (not a real secret).
const TEST_PRIVATE_KEY = process.env.TEST_CF_PRIVATE_KEY ?? "";

describe("signAudioUrl", () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CDN_URL = "https://d2y722s9xxtvrs.cloudfront.net";
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  it("falls back to an unsigned CDN URL when signing keys are absent", () => {
    delete process.env.CLOUDFRONT_KEY_PAIR_ID;
    delete process.env.CLOUDFRONT_PRIVATE_KEY;
    const url = signAudioUrl("audio/tracks/x.mp3");
    expect(url).toBe("https://d2y722s9xxtvrs.cloudfront.net/audio/tracks/x.mp3");
  });

  it("returns null for a null key", () => {
    expect(signAudioUrl(null)).toBeNull();
  });

  it("produces a signed URL with CloudFront query params when keys are set", () => {
    if (!TEST_PRIVATE_KEY) return; // skip if no test key provided in env
    process.env.CLOUDFRONT_KEY_PAIR_ID = "TESTKEYPAIRID";
    process.env.CLOUDFRONT_PRIVATE_KEY = TEST_PRIVATE_KEY;
    const url = signAudioUrl("audio/tracks/x.mp3")!;
    expect(url).toContain("audio/tracks/x.mp3");
    expect(url).toContain("Expires=");
    expect(url).toContain("Signature=");
    expect(url).toContain("Key-Pair-Id=TESTKEYPAIRID");
  });
});
```

Note: the third assertion is guarded by `TEST_CF_PRIVATE_KEY` so the suite stays green in CI without a key; to exercise it locally, generate a throwaway key and run `TEST_CF_PRIVATE_KEY="$(awk 'NF{printf "%s\\n",$0}' cloudfront_private_key.pem)" npm test -- client`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- client`
Expected: FAIL — `signAudioUrl` is not exported.

- [ ] **Step 4: Implement `signAudioUrl`** in `src/lib/s3/client.ts` (add import at top and the function after `getMediaUrl`)

```ts
import { getSignedUrl as getCloudFrontSignedUrl } from "@aws-sdk/cloudfront-signer";
```

```ts
// How long an audio signed URL stays valid. Long enough to outlive any single
// listen + seeking session (no mid-song 403), short enough that a scraped
// redirect URL dies within the day.
const SIGNED_URL_TTL_SEC = 21600; // 6 hours

/**
 * Sign a CloudFront URL for a track-audio key so it can be fetched from the
 * (now access-restricted) `audio/tracks/*` path. Falls back to an unsigned CDN
 * URL when signing keys aren't configured (local dev) so playback still works.
 *
 * `dateLessThan` is intentionally the only policy field — a canned policy keeps
 * the URL short and CloudFront-cache-friendly.
 */
export function signAudioUrl(
  key: string | null | undefined,
  ttlSec: number = SIGNED_URL_TTL_SEC
): string | null {
  const base = getMediaUrl(key);
  if (!base) return null;

  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
  const privateKeyRaw = process.env.CLOUDFRONT_PRIVATE_KEY;
  if (!keyPairId || !privateKeyRaw) {
    // Unconfigured (local dev): return the unsigned URL. In prod the keys exist.
    return base;
  }
  // Env stores the PEM with literal "\n"; restore real newlines.
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  return getCloudFrontSignedUrl({
    url: base,
    keyPairId,
    privateKey,
    dateLessThan: new Date(Date.now() + ttlSec * 1000).toISOString(),
  });
}
```

- [ ] **Step 5: Run test to verify pass**

Run: `npm test -- client`
Expected: fallback + null tests PASS (signed test skipped without a key).

- [ ] **Step 6: Document env vars** — append to `.env.example` after the `NEXT_PUBLIC_CDN_URL` line:

```
# CloudFront signed URLs for track audio (audio/tracks/*). Server-only secrets.
# CLOUDFRONT_KEY_PAIR_ID is the CloudFront public-key id; CLOUDFRONT_PRIVATE_KEY
# is the PEM private key with newlines written as literal \n.
CLOUDFRONT_KEY_PAIR_ID=
CLOUDFRONT_PRIVATE_KEY=
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/s3/client.ts src/lib/s3/client.test.ts .env.example package.json package-lock.json
git commit -m "feat(media): signAudioUrl helper for CloudFront signed audio URLs"
```

### Task 3: Sign the entitled redirect in the audio gate

**Files:**
- Modify: `src/app/api/tracks/[id]/audio/route.ts:3,46-52`

- [ ] **Step 1: Swap `getMediaUrl` → `signAudioUrl` for the entitled redirect**

Change the import on line 3:

```ts
import { signAudioUrl, getObjectRange } from "@/lib/s3/client";
```

Replace the entitled branch (lines 45–52):

```ts
    // Entitled → hand off to the CDN via a short-lived signed URL (no server
    // bandwidth, and the URL is dead within hours if copied).
    if (full) {
      const url = signAudioUrl(track.audioKey);
      if (!url) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.redirect(url, 302);
    }
```

(The preview branch still uses `getObjectRange` — it streams from S3 via IAM, unaffected by CloudFront signing. `getMediaUrl` is no longer used in this file; remove it from the import as shown above.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` (no new errors). Manual (local, keys optional — fallback returns unsigned): `npm run dev`, then as a signed-in paid/admin user hit `/api/tracks/carry-on/audio` and confirm a 302 to a cloudfront URL (with signing keys set locally, the URL carries `Signature=`/`Key-Pair-Id=`). As a visitor, confirm you still get the capped preview (206/200 audio bytes), not a redirect.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/tracks/[id]/audio/route.ts"
git commit -m "feat(media): sign the entitled audio redirect"
```

### Task 4: Stop the shared helper from emitting raw audio URLs (leak-proofing) + guard test

Once CloudFront is locked, any raw `audio/tracks/*` URL in a response is both a theft vector AND broken (403). Make the helper incapable of emitting one.

**Files:**
- Modify: `src/lib/s3/client.ts:104-137` (`buildTrackMediaUrls`, `buildTrackMediaUrlsWithFallback`)
- Modify: `src/lib/s3/client.test.ts` (guard test)

- [ ] **Step 1: Write the failing guard test** — add to `src/lib/s3/client.test.ts`:

```ts
import { buildTrackMediaUrls } from "./client";

describe("buildTrackMediaUrls audio safety", () => {
  it("never emits a raw CDN audio URL", () => {
    const urls = buildTrackMediaUrls({
      artworkKey: "images/artwork/a.jpg",
      audioKey: "audio/tracks/x.mp3",
      videoKey: null,
      videoThumbnailKey: null,
      originalAudioKey: "audio/originals/x.wav",
    });
    expect(urls.audioUrl).toBeNull();
    expect(urls.originalAudioUrl).toBeNull();
    // artwork stays a real URL
    expect(urls.artworkUrl).toContain("images/artwork/a.jpg");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- client`
Expected: FAIL — `audioUrl` is currently the raw CDN URL, not null.

- [ ] **Step 3: Make the helper emit null for audio** — in `buildTrackMediaUrls` (lines 111–117) change the two audio lines:

```ts
  return {
    artworkUrl: getMediaUrl(track.artworkKey),
    // Audio is never handed out as a raw URL — playback goes through
    // /api/tracks/:id/audio, which signs a short-lived CloudFront URL.
    audioUrl: null,
    videoUrl: getMediaUrl(track.videoKey),
    videoThumbnailUrl: getMediaUrl(track.videoThumbnailKey),
    // Lossless master is never exposed to the browser.
    originalAudioUrl: null,
  };
```

(`buildTrackMediaUrlsWithFallback` spreads this, so it inherits the change.)

- [ ] **Step 4: Run test to verify pass**

Run: `npm test -- client`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/s3/client.ts src/lib/s3/client.test.ts
git commit -m "feat(media): helper no longer emits raw audio URLs"
```

### Task 5: Route every playback consumer through the API path

Now that the helper emits `audioUrl: null`, every route/page that serves a playable track must explicitly set `audioUrl` to `/api/tracks/${id}/audio`. (The main list route already does this for locked tracks; make it unconditional and add it to the routes that were leaking.)

**Files:**
- Modify: `src/app/api/tracks/route.ts` (2 spots: ~line 85 and ~line 136)
- Modify: `src/app/api/tracks/[id]/route.ts:37`
- Modify: `src/app/api/tracks/batch/route.ts:48`
- Modify: `src/app/api/collections/[id]/route.ts:75`
- Modify: `src/app/api/admin/tracks/route.ts:55`
- Modify: `src/app/api/admin/tracks/[id]/route.ts:37`
- Modify: `src/app/(app)/page.tsx` (featured-track audio)

- [ ] **Step 1: `tracks/route.ts` — make audioUrl unconditional** (both map blocks). Replace the audio-gate ternary:

```ts
          audioUrl: `/api/tracks/${track.id}/audio`,
          originalAudioUrl: null,
```

Do this in BOTH places (the "all tracks" block ~85 and the "by collection" block ~136). Remove any now-unused `getMediaUrl` import if it is no longer referenced in the file (check with a grep; `canPlayFullTrack`/`previewDuration` still drive `isLocked`/`previewDuration`, keep those).

- [ ] **Step 2: `tracks/[id]/route.ts` — set audioUrl after the spread**

```ts
    const response = {
      id: track.id,
      collectionId: track.collectionId,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      trackNumber: track.trackNumber,
      playCount: track.playCount,
      favoriteCount: track.favoriteCount,
      hasVideo: track.hasVideo,
      videoCount: track.videoCount,
      hasLyrics: track.hasLyrics,
      ...buildTrackMediaUrlsWithFallback(track, collection?.artworkKey ?? null),
      audioUrl: `/api/tracks/${track.id}/audio`,
    };
```

- [ ] **Step 3: `tracks/batch/route.ts` — set audioUrl in the map**

```ts
    const tracksWithUrls = rawTracks.map((track) => ({
      id: track.id,
      collectionId: track.collectionId,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      trackNumber: track.trackNumber,
      playCount: track.playCount,
      favoriteCount: track.favoriteCount,
      hasVideo: track.hasVideo,
      videoCount: track.videoCount,
      hasLyrics: track.hasLyrics,
      ...buildTrackMediaUrlsWithFallback(
        track,
        collectionMap.get(track.collectionId) ?? null
      ),
      audioUrl: `/api/tracks/${track.id}/audio`,
    }));
```

- [ ] **Step 4: `collections/[id]/route.ts` — set audioUrl in the track map** (after the `...buildTrackMediaUrlsWithFallback(track, collection.artworkKey)` spread, ~line 75):

```ts
          ...buildTrackMediaUrlsWithFallback(track, collection.artworkKey),
          audioUrl: `/api/tracks/${track.id}/audio`,
```

- [ ] **Step 5: admin routes — set audioUrl to the API path** (admin = paid tier, so the gate returns a full signed redirect). In `admin/tracks/route.ts:55`:

```ts
      { ...track, ...buildTrackMediaUrls(track), audioUrl: `/api/tracks/${track.id}/audio` },
```

In `admin/tracks/[id]/route.ts:37`:

```ts
    return NextResponse.json({ ...track, ...buildTrackMediaUrls(track), audioUrl: `/api/tracks/${track.id}/audio` });
```

- [ ] **Step 6: home RSC `app/(app)/page.tsx`** — the featured track AND its queue both spread `buildTrackMediaUrlsWithFallback` (which now yields `audioUrl: null`), so both need the explicit API path or the global player drops into simulated mode. Set it in both objects:

`featuredTrack` (after the spread, ~line 48):

```ts
      featuredTrack = {
        ...track,
        ...buildTrackMediaUrlsWithFallback(track, collectionArtworkKey),
        audioUrl: `/api/tracks/${track.id}/audio`,
        isLocked: !featuredFull,
        previewDuration: featuredFull ? track.duration : previewDur,
        isFeatured: true,
      };
```

`featuredQueue` map (after the spread, ~line 58):

```ts
        return {
          ...t,
          ...buildTrackMediaUrlsWithFallback(t, collectionArtworkKey),
          audioUrl: `/api/tracks/${t.id}/audio`,
          isLocked: !tFull,
          previewDuration: tFull ? t.duration : previewDur,
        };
```

No `getMediaUrl(...audioKey...)` exists elsewhere in this file (only the build helpers, now audio-null).

- [ ] **Step 7: Verify the whole surface**

Run: `npx tsc --noEmit` (no new errors), `npm test` (all pass).
Grep guard: `grep -rn "getMediaUrl" src/app | grep -i audio` should return **nothing** (no route builds a raw audio URL anymore). Also `grep -rn "buildTrackMediaUrls" src/app` — every hit should be followed by an explicit `audioUrl:` override except purely artwork contexts.

- [ ] **Step 8: Commit**

```bash
git add src/app
git commit -m "feat(media): route all audio playback through the signing endpoint"
```

### Task 6: Promo page — sign the free track via a dedicated endpoint

The promo page gives anonymous visitors ONE full listen, so it can't use `/api/tracks/[id]/audio` (that caps visitors at 30s). It needs a full signed URL for the allowlisted promo track. Serve it via a 302 endpoint so the signed URL never sits in page source.

**Files:**
- Create: `src/app/api/promo/audio/route.ts`
- Modify: `src/app/another-testament/page.tsx` (drop server-rendered audio URL; pass the endpoint path)
- Modify: `src/components/promo/PromoPlayer.tsx` (accept `audioUrl` as the endpoint path — no signature change needed, it already takes `audioUrl`)
- Modify: `src/middleware.ts` (PUBLIC_PATHS already includes `/api/promo` from the promo build — verify)

- [ ] **Step 1: Create the promo audio endpoint**

```ts
import { NextResponse } from "next/server";
import { getTrackById } from "@/lib/db/queries";
import { signAudioUrl } from "@/lib/s3/client";

// Only tracks intentionally given away in full on a promo page.
const PROMO_TRACKS = new Set(["carry-on"]);

export async function GET(request: Request) {
  try {
    const trackId = new URL(request.url).searchParams.get("track") ?? "";
    if (!PROMO_TRACKS.has(trackId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const track = await getTrackById(trackId);
    if (!track?.audioKey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const url = signAudioUrl(track.audioKey);
    if (!url) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.redirect(url, 302);
  } catch (error) {
    console.error("Error signing promo audio:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Point the promo page at the endpoint** — in `src/app/another-testament/page.tsx`, replace the `audioUrl` derivation. Currently:

```ts
  const audioUrl = track ? getMediaUrl(track.audioKey) : null;
```

Change to a fixed endpoint path (and remove the now-unused `getMediaUrl` import if nothing else in the file uses it — `artworkUrl` still uses it, so keep the import):

```ts
  const audioUrl = track ? `/api/promo/audio?track=${track.id}` : null;
```

(`artworkUrl` stays `getMediaUrl(track.artworkKey)` — artwork is public.)

- [ ] **Step 3: Confirm middleware public path** — `grep -n "/api/promo" src/middleware.ts`. It should already be in `PUBLIC_PATHS` (added when the promo play endpoint shipped). If not, add `"/api/promo",` to the array.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`, `npm test`. Manual: dev server, load `/another-testament`, view source and confirm **no cloudfront audio URL appears in the HTML** (only `/api/promo/audio?track=carry-on`). Click play → Network shows `GET /api/promo/audio?track=carry-on` → 302 → cloudfront (signed if keys set locally) → audio plays. Confirm the one-free-listen gate still triggers on `ended`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/promo/audio src/app/another-testament/page.tsx src/middleware.ts
git commit -m "feat(promo): serve the free promo track via a signed-URL endpoint"
```

### Task 7: Remove the "Offline downloads" onboarding promise

**Files:**
- Modify: `src/components/onboarding/OnboardingStepUpgrade.tsx:6-12`

- [ ] **Step 1: Delete the unbacked bullet** — in the `BENEFITS` array, remove the `"Offline downloads on mobile",` line:

```ts
const BENEFITS = [
  "Unlock every track in every collection",
  "Lossless audio quality",
  "Ad-free, distraction-free listening",
  "Support the artists making HYMNZ",
];
```

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit`.

```bash
git add src/components/onboarding/OnboardingStepUpgrade.tsx
git commit -m "chore(onboarding): drop unimplemented offline-downloads claim"
```

### Task 8: Full verification + PR

- [ ] **Step 1: Static checks**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all pass; `/api/tracks/[id]/audio`, `/api/promo/audio` present in the build output.

- [ ] **Step 2: Leak sweep**

Run: `grep -rn "getMediaUrl" src/app | grep -i audio` → nothing.
Run: `grep -rn "cloudfront" src/ | grep -v test` → only in comments/env docs, never a hardcoded audio URL in a component.

- [ ] **Step 3: Local functional verification** (with `CLOUDFRONT_KEY_PAIR_ID` + `CLOUDFRONT_PRIVATE_KEY` set in `.env.local` so signing is live, and the CloudFront lock from Task 1 deployed):

- Paid/admin user: play a track → `/api/tracks/:id/audio` → 302 signed cloudfront → plays; seek works; no mid-song failure.
- Free user: featured/Sacred-7 track plays full (signed); a locked track gives the capped preview then the upgrade prompt.
- Anonymous on `/another-testament`: play → `/api/promo/audio` → 302 signed → full listen; gate on end; no cloudfront URL in page source.
- Copy a signed URL from Network, wait past TTL (or tamper a character) → cloudfront **403** (proves the lock).
- Directly hit `https://<cdn>/audio/tracks/<key>.mp3` unsigned → **403**.
- Jingle still plays at preview-end (audio/system stayed public).

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/audio-url-signing
gh pr create --title "feat: sign track audio URLs (stop CDN scraping)" --body "..."
```

PR body: summarize the lock (CloudFront trusted key group on `audio/tracks/*`, direct S3 already 403), the signing helper + 6h TTL, the three routed consumers (main/promo/admin), the leak-proof helper + guard test, removed onboarding claim. **Include the cutover checklist below.**

---

## Cutover checklist (order matters)

1. **Merge the code first** (Tasks 2–8). With no CloudFront lock and no prod keys yet, `signAudioUrl` falls back to unsigned URLs → zero behavior change, safe to deploy anytime.
2. **Set prod env vars** `CLOUDFRONT_KEY_PAIR_ID` + `CLOUDFRONT_PRIVATE_KEY` in Vercel and redeploy. Now the app MINTS signed URLs, but the files are still publicly reachable (lock not on yet) → still works, signed URLs are just belt-and-suspenders.
3. **Flip the CloudFront lock** (Task 1, Step 3). The moment it deploys, unsigned `audio/tracks/*` requests 403 — and every legit path is already sending signed URLs from step 2. Verify with Task 8 Step 3.
4. **Rollback if needed:** delete the `audio/tracks/*` behavior (or set Restrict viewer access = No). Files go public again on deploy; the app keeps working (signed URLs still resolve).

## Out of scope (documented follow-ups)

- **Lossless masters** (`audio/originals/*`): admin-only, never publicly linked, so lower risk. To protect them later, add the same trusted-key-group restriction on `audio/originals/*` and sign them in the admin download path (`admin/convert` uses server-side S3, unaffected).
- **Video** (`videoKey`): currently ungated everywhere; a separate media class. Only worth signing if video content becomes a theft concern.
- **Artwork**: intentionally left public (signing breaks the immutable image cache + service-worker cache for negligible benefit).
