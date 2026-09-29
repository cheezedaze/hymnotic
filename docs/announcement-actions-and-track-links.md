# Announcement actions and track links

Implemented September 29, 2026.

## Using announcement buttons

In **Admin → Updates**, create or edit an announcement and choose **Optional button**:

- **None:** dismiss-only, including existing announcements.
- **Play a track:** select a released track. While music is playing, listeners see **Play Now**, **Add to Up Next**, and **Dismiss**. An idle or paused player shows **Play Now** and **Dismiss**.
- **Open a link / video:** enter custom button text and an HTTPS URL or local path. HYMNZ routes stay in the app; external destinations use its browser helper.

**Add to Up Next** inserts the selected song immediately after the current one, preserving playback position and the remaining queue. An existing occurrence is moved rather than duplicated. **Play Now** starts/resumes the song and preserves the remaining queue. Choosing another song clears repeat-one; shuffle order is otherwise retained. Existing visitor/free/paid access rules still apply.

The same actions appear in Library → Updates and Profile → Recent Updates. New announcements created by the track-release workflow automatically include their track action. Existing announcements are not republished or modified automatically.

The additive migration is `drizzle/0015_announcement_actions.sql`. Apply it before deploying to another environment; it is safe to reapply. It was applied to production before the CTA deployment. This repository's manually numbered migrations are not all registered in Drizzle's old journal, so do not assume the journal runner applies this file.

## Track links and sharing

Canonical URL: `https://www.hymnz.com/track/{encoded-track-id}`.

- The public landing page stays on the selected song. Opening it does not start playback or consume a free listen.
- Play Now and Add to Up Next use the same access-aware queue actions as announcements.
- Sharing opens the HYMNZ preview first, followed by an explicit system-share tap or Copy Link. Native builds use Capacitor Share; browsers use Web Share when available.
- A canonical URL, not an image attachment, is shared. The page's Open Graph/Twitter image is a branded 1200×630 PNG, also used in the in-app preview.
- Missing artwork has a branded fallback. Inactive/missing tracks return not found.

The August design was used as a guide. The principal deliberate change is playing/inserting directly from the landing page instead of redirecting through a collection's `?play=` handoff. This preserves the listener's queue, supports a playable track even if its collection is unavailable, and keeps playback behind an explicit tap. Track metadata loads ahead of the tap so browser playback can retain user activation.

## Native rollout

Both native projects include Capacitor App and Share. iOS has `applinks:www.hymnz.com`; Android has the verified HTTPS track intent filter. The root listener handles cold/warm launches, ignores untrusted URLs, suppresses duplicate delivery, and never changes playback when opening a link.

Website verification endpoints:

- `/.well-known/apple-app-site-association`: production app ID `GGQ33S5R67.com.hymnz.app`, track paths only.
- `/.well-known/assetlinks.json`: package `com.hymnz.app`. Requires `ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS`, a comma-separated list of SHA-256 certificate fingerprints. Use the **Play App Signing key certificate**, not just the upload key. Missing/malformed configuration deliberately returns 503 with no cache.

Web pages and announcement CTAs are available immediately after the website deployment, including the hosted web UI in existing native apps. Opening installed apps from external links and the native share plugin require new mobile builds.

Before mobile release:

1. Set the production Android fingerprint variable and redeploy. Verify both association endpoints return 200 JSON without authentication, redirects, or cookies.
2. Archive/sign iOS and build/sign the Android release using the existing release workflow. Simulator/debug builds do not establish distribution signing or domain verification.
3. Test TestFlight and Android internal-test installs with links opened from Messages/email in terminated, backgrounded, and foreground states. Check an already-playing queue is untouched until an action is tapped.
4. Check app-not-installed web fallback, sharing to Messages and a social destination, cancellation, copy-link fallback, and visitor/free/paid playback limits.
5. Submit the mobile updates. Do not declare Android verified before the production Play certificate is configured and device verification passes.

## Verification notes

- All **225 tests passed**, including the 30 opt-in integration tests, using a disposable localhost PostgreSQL database with external messaging mocked. The test database was stopped afterward; production data was not used.
- Unit coverage includes queue preservation/deduplication/shuffle, button states, admin validation, access-aware track metadata, URL parsing, native lifecycle handling, association documents, share payloads, public metadata, and valid/fallback/corrupt-artwork PNGs.
- Browser checks cover no-autoplay landing, explicit Play Now, Up Next preserving current playback and subsequent queue, branded preview, Copy Link, and phone-size layout.
- Production Next.js build, TypeScript checking, iOS simulator compilation, and Android debug compilation passed.
- Focused lint has no errors. Source-wide lint still reports 15 pre-existing errors outside this change; changed UI includes three image-optimization warnings. The unscoped lint script also traverses unrelated `.claude/worktrees`, so source-wide lint was checked with `npx eslint src`.
- Native device lifecycle/domain verification and app-store submission remain release checks, not claims made by unit tests or simulator/debug compilation.

## Production deployment

- CTA deployed first: `dpl_DpabbYKXFSkZEp2UBfPTExm2ToL6`.
- Deep-link web experience deployed next: `dpl_BtAzxXDQbYgZtX5kFgdMEQDKMLQu`, aliased to `https://www.hymnz.com`.
- Unauthenticated production checks: active track page 200 with canonical/OG tags, branded PNG 200 at 1200×630, nonexistent track 404, Apple association 200 JSON without redirects/cookies.
- Android association currently returns the intended 503/no-store response because the Play signing fingerprint has not yet been supplied. This is a remaining rollout requirement, not a verified Android App Links release.
