# CloudFront Signed URLs for Track Audio — Runbook

Protects `audio/tracks/*` (the track MP3s) so they can only be fetched via short-lived
CloudFront signed URLs. Artwork, video, the player jingle (`audio/system/*`), and lossless
masters (`audio/originals/*`) stay public. See the plan:
`docs/superpowers/plans/2026-07-17-audio-url-signing.md`.

## Provisioned resources (account 301962893585)

| Resource | Value |
|---|---|
| CloudFront distribution | `E68JXX74O21KI` (host `d2y722s9xxtvrs.cloudfront.net`) |
| Public key id (= `CLOUDFRONT_KEY_PAIR_ID`) | `KC5PWMT2MZRI6` |
| Trusted key group id | `de92c9b3-ff0b-430b-90ea-aaf259733e37` |
| Cache policy for the new behavior | `44a5f27e-151e-485d-aa62-b60be8d24077` (HymnoticMediaStreaming — Range support) |
| Private key | generated locally; stored in `.env.local` and Vercel as `CLOUDFRONT_PRIVATE_KEY`. **Never committed.** |

Existing cache behaviors before the lock: `audio/*` and `video/*` (both cache policy
`44a5f27e...`, no trusted key groups). The lock ADDS a more-specific `audio/tracks/*`
behavior; CloudFront matches most-specific-first, so the jingle (`audio/system/*`) and
masters (`audio/originals/*`) keep falling through to the unrestricted `audio/*` behavior.

## Environment variables

Server-only (NOT `NEXT_PUBLIC_`). Set in `.env.local` (local) and Vercel (Production + Preview):

- `CLOUDFRONT_KEY_PAIR_ID=KC5PWMT2MZRI6`
- `CLOUDFRONT_PRIVATE_KEY=` the PEM private key with newlines as literal `\n` (single line).

`signAudioUrl` (`src/lib/s3/client.ts`) falls back to an **unsigned** URL when either var is
absent, so code is safe to deploy before the keys/lock exist.

## Cutover order (DO NOT flip the lock before code is deployed)

1. Merge + deploy the `feat/audio-url-signing` code to production. With no prod keys and no
   lock, `signAudioUrl` returns unsigned URLs → zero behavior change.
2. Set `CLOUDFRONT_KEY_PAIR_ID` + `CLOUDFRONT_PRIVATE_KEY` in Vercel (Production + Preview),
   redeploy. Now the app mints signed URLs, but files are still publicly reachable → still works.
3. **Flip the lock** (script below). The instant it deploys, unsigned `audio/tracks/*` → 403,
   and every legit path is already sending signed URLs from step 2.

## Flip the lock (run once, at cutover)

Adds the `audio/tracks/*` behavior restricted to the trusted key group. Run from the repo root
with AWS creds available (the app's `.env.local` creds work):

```bash
bash infrastructure/s3/lock-audio-tracks.sh
```

The script (`infrastructure/s3/lock-audio-tracks.sh`, committed alongside this runbook) fetches
the live distribution config + ETag, injects the behavior, and calls `update-distribution`.
It refuses to run twice (checks whether `audio/tracks/*` already exists).

## Verify (after the distribution finishes deploying, ~5–10 min)

```bash
# Unsigned track audio must now FAIL:
curl -s -o /dev/null -w "unsigned: %{http_code}\n" \
  "https://d2y722s9xxtvrs.cloudfront.net/audio/tracks/Master_Carry-Onmixdown-1771529276969.mp3"
# Expected: 403

# App-signed URL must WORK (mint one via the promo endpoint on prod):
SIGNED=$(curl -s -o /dev/null -w "%{redirect_url}" "https://hymnz.com/api/promo/audio?track=carry-on")
curl -s -o /dev/null -w "signed: %{http_code}\n" "$SIGNED"
# Expected: 200

# Jingle + artwork must STILL be public:
curl -s -o /dev/null -w "jingle: %{http_code}\n"  "https://d2y722s9xxtvrs.cloudfront.net/audio/system/hymnz-jingle.mp3"
curl -s -o /dev/null -w "artwork: %{http_code}\n" "https://d2y722s9xxtvrs.cloudfront.net/images/artwork/Carry-On-1776374689799.jpg"
# Expected: 200, 200
```

Then exercise the app: paid user plays a track, free user gets preview + full featured/Sacred-7,
anonymous promo listen works, and a signed URL copied from the Network tab 403s after its 6h TTL.

## Rollback

Remove the restriction — files go public again on the next distribution deploy; the app keeps
working (signed URLs still resolve):

```bash
# In the AWS console: CloudFront → E68JXX74O21KI → Behaviors → delete the audio/tracks/* behavior
# (or set "Restrict viewer access" = No on it).
```

Or via CLI, delete the `audio/tracks/*` entry from `CacheBehaviors.Items` and `update-distribution`
with the current ETag (inverse of the lock script).
