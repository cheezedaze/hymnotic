# Track Deep Linking and Branded Sharing — Design

**Date:** 2026-08-13
**Status:** Approved by owner for implementation planning

## Problem

HYMNZ has an initial track-sharing implementation, but it does not yet provide a dependable cross-platform experience:

- `/track/:id` exists and publishes track metadata, but the route redirects after 100 ms and starts playback. The recipient does not get a stable track page or a deliberate Play action.
- iOS and Android are not configured to claim HYMNZ track URLs, so an installed app is not a verified destination for a shared HTTPS link.
- A running Capacitor app does not listen for incoming URL-open events, so it cannot reliably navigate when a second track link is opened.
- The share button tries the browser Web Share API before showing the HYMNZ share sheet. This skips the branded preview on many mobile devices, and Web Share behavior inside native webviews is inconsistent.
- Social metadata uses raw track or collection artwork. The receiving app therefore has no consistent HYMNZ logo, title layout, or branded composition.

The goal is one durable track URL that works in announcements, copied text, social posts, the website, and both mobile apps.

## Product decisions

- **Canonical URL:** `https://www.hymnz.com/track/{track-id}`. All generated track links use the `www` host; links do not depend on redirects from the apex domain.
- **Recipient playback:** opening a link selects and displays the exact track but never starts playback. The recipient must tap Play.
- **Share-card content:** artwork, track title, artist, and HYMNZ branding. No lyrics, song-option selector, color picker, or alternate templates.
- **Consistency mechanism:** share the canonical link and let Messages/social clients render its Open Graph metadata. Do not attach a standalone image file, because receiving apps handle mixed image/text/URL shares inconsistently and may discard the link.
- **App fallback:** verified HTTPS app links open the installed app. Without the app, or if platform verification fails, the same URL remains a complete web destination.
- **Public access:** a recipient may view the track landing page while signed out. Existing visitor/free/paid playback limits apply only after Play is tapped.

## Recommended architecture

Use first-party Apple Universal Links and Android App Links for the existing HTTPS route. This preserves one URL across every destination and avoids a custom scheme or third-party smart-link service.

The implementation has five focused parts:

1. A canonical share-data builder used by every share entry point.
2. A HYMNZ share sheet that previews the branded card before invoking a system share surface.
3. Dynamic route-specific Open Graph images using the same card content.
4. A non-autoplay track landing flow.
5. Native website association plus cold- and warm-start URL handling.

## URL contract

### Supported public link

```
https://www.hymnz.com/track/{track-id}
```

`{track-id}` is exactly one encoded path segment. Query parameters and fragments are not needed for the initial contract. Native parsing accepts only:

- the `https` scheme;
- the exact `www.hymnz.com` hostname;
- a pathname of `/track/<one non-empty segment>`; and
- no additional path segments.

Unknown hosts, non-HTTPS schemes, malformed URLs, and non-track paths are ignored by the native handler. They never become arbitrary in-app navigation targets.

The implementation centralizes URL and text generation outside the React hook so server code, browser code, and unit tests cannot drift. Production share URLs always use the canonical origin, even if the user is currently on localhost or an alternate deployment host.

### Shared text

Track shares use:

```
Listen to “{title}” by {artist} on HYMNZ
{canonical URL}
```

The existing collection share behavior remains available and continues to use `/collection/{id}`. Verified native deep linking and the new dynamic branded social image are scoped to tracks.

## Recipient flow

`/track/[id]` remains a public server-rendered page. It loads the active track, its collection, and the best artwork in this order:

1. Track artwork
2. Collection artwork
3. Branded HYMNZ fallback

The page renders artwork, title, artist, collection name when present, and a Play button. The existing timed redirect is removed.

Nothing updates the player store, requests track audio, increments playback, or consumes a free listen until the recipient taps Play. On that tap, HYMNZ navigates to the track's collection with the existing `?play={track-id}` handoff. The collection builds the access-aware queue and starts the exact track using the existing playback path.

A missing or inactive track returns the standard not-found response. A track without a usable collection remains visible as a landing page, but its Play action returns to the catalog rather than fabricating a queue.

## Share experience

### In-app share sheet

Pressing any track Share button always opens the HYMNZ share sheet first. It no longer immediately invokes `navigator.share`.

The sheet contains:

- a landscape branded preview card;
- **Share…**, the primary action;
- **Copy link**, which copies only the canonical URL; and
- the existing direct social destinations when the current browser has no system share capability.

The card uses a 1.91:1 composition matching the 1200×630 Open Graph image: square artwork at the left, track title and artist at the right, and the HYMNZ logo plus “Listen on HYMNZ” branding. This layout favors consistency across Messages and major social link previews rather than reproducing Spotify's portrait customization screen.

### System sharing

In a Capacitor app, **Share…** calls the official `@capacitor/share` plugin with title, text, and URL. On the web, it calls `navigator.share` only from the explicit **Share…** tap. If system sharing is unavailable or fails, the sheet remains open and exposes Copy link/direct destinations. Cancellation is not shown as an error.

The system payload contains the canonical URL rather than a file attachment. The destination app can therefore render the same server-hosted preview and the recipient always retains a tappable deep link.

## Branded link preview

Add a dynamic Open Graph image for `track/[id]` using Next.js `ImageResponse` at 1200×630. It reads the same public track information as the landing page and renders:

- resolved artwork, with a branded fallback;
- track title;
- artist; and
- the HYMNZ logo and listen label.

The track page's Open Graph and Twitter metadata points to this generated image rather than raw artwork. Metadata retains the canonical URL, `music.song` type, title, artist, site name, and descriptive text.

The in-app preview and server image share the same content hierarchy, dimensions, colors, and wording. They may use platform-appropriate rendering implementations, but they must remain visually equivalent.

If remote artwork cannot be loaded while generating an image, the endpoint still returns a valid branded card instead of failing the share preview.

## Native deep-link handling

### iOS Universal Links

Add this associated domain to the app target:

```
applinks:www.hymnz.com
```

Serve `https://www.hymnz.com/.well-known/apple-app-site-association` directly as `application/json`, without authentication or redirects. Its `applinks` entry authorizes only `/track/*` for the production application identifier:

```
GGQ33S5R67.com.hymnz.app
```

The current `AppDelegate` already forwards universal-link activities to Capacitor's `ApplicationDelegateProxy`; that forwarding remains unchanged.

### Android App Links

Add an exported VIEW intent filter to `MainActivity` with:

- `android:autoVerify="true"`;
- DEFAULT and BROWSABLE categories;
- scheme `https`;
- host `www.hymnz.com`; and
- path prefix `/track/`.

Serve `https://www.hymnz.com/.well-known/assetlinks.json` directly as `application/json`, without authentication or redirects. It grants `delegate_permission/common.handle_all_urls` to package `com.hymnz.app` and one or more configured SHA-256 signing-certificate fingerprints.

The Play App Signing certificate fingerprint is required for Play-distributed builds. An upload/release certificate fingerprint may also be included to support directly installed release builds. Fingerprints are public verification data but remain deployment configuration so the implementation never guesses a signing identity. The website deployment must receive a non-empty, validated `ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS` value before the Android release is considered ready.

### Capacitor navigation

Install the official `@capacitor/app` plugin and add a small native-only deep-link handler near the root layout. It handles both:

- `App.getLaunchUrl()` for a cold launch; and
- the `appUrlOpen` listener for a running or backgrounded app.

Both paths use the same pure URL parser. A valid track URL navigates the Next router to `/track/{id}`. Duplicate delivery of the route already on screen is a no-op. The listener is removed when the React component unmounts.

Older app versions without the new entitlement/plugin continue to open the web URL, so the rollout degrades safely.

## Website association endpoints

Implement the two `.well-known` documents as focused Next.js route handlers rather than hand-maintained public files. Small pure builder functions make their JSON independently testable.

Requirements for both responses:

- HTTP 200 in a correctly configured production deployment;
- `Content-Type: application/json`;
- no authentication;
- no redirects;
- no cookies;
- stable cache headers appropriate for platform verification; and
- the exact production identifiers and approved `/track/*` scope.

The Android route fails closed in a misconfigured deployment rather than publishing an association with invented or empty fingerprints. Deployment verification must catch this before a mobile release.

## Error and fallback behavior

- **Invalid or inactive track:** standard 404; no redirect and no playback.
- **Missing artwork:** render the branded fallback in the landing page, share sheet, and Open Graph image.
- **Unsupported system sharing:** retain the HYMNZ sheet with Copy link and direct destinations.
- **Canceled system share:** close the operating-system sheet only; keep the HYMNZ sheet available without an error toast.
- **Untrusted incoming URL:** ignore it and leave the current app route unchanged.
- **Association verification failure:** operating system opens the canonical website, which provides the same track page.
- **Native handler initialization failure:** log a concise development warning and leave ordinary in-app navigation intact.

## Testing strategy

Implementation follows red-green-refactor for each behavior.

### Automated tests

1. **Share data**
   - Track URLs always use the canonical `www` origin.
   - IDs are encoded as one path segment.
   - Track and collection text use the correct wording and fallback artist.

2. **Deep-link parsing**
   - Accept the exact canonical HTTPS track URL.
   - Accept valid encoded IDs.
   - Reject the apex domain, lookalike hosts, HTTP, custom schemes, empty IDs, extra segments, and non-track paths.

3. **Association documents**
   - AASA contains the production app ID and only the track scope.
   - Asset Links contains the production package and every configured normalized SHA-256 fingerprint.
   - Empty or malformed Android fingerprint configuration is rejected.
   - Route responses have JSON content types and the expected status behavior.

4. **Track entry behavior**
   - Loading the landing page does not create a play/navigation side effect.
   - The Play action targets the correct collection and track.
   - Missing/inactive tracks are not exposed as playable landing pages.

5. **Share invocation**
   - Opening Share displays the HYMNZ sheet before any platform share call.
   - The explicit Share action passes the canonical title, text, and URL.
   - Failure preserves Copy link/direct fallbacks.

6. **Metadata/image behavior**
   - Track metadata uses a canonical URL and branded image.
   - The image endpoint returns a 1200×630 PNG for artwork and fallback cases.

Run targeted tests during each TDD cycle, then the full Vitest suite, lint, and production build.

### Device and deployment verification

Automated unit tests do not prove operating-system domain verification. Before release:

1. Request both `.well-known` URLs from production and confirm HTTP 200, JSON content type, and no redirect chain.
2. Validate a real track page's Open Graph tags and image from an unauthenticated request.
3. Install the iOS build through TestFlight and test a Messages link with the app terminated, backgrounded, and already foregrounded.
4. Install the Android internal-test build, force App Links re-verification, inspect the verified-domain state, and test the same three lifecycle states.
5. Uninstall each app and confirm the identical link opens the functioning web landing page.
6. Share from the web, iOS app, and Android app to Messages plus at least one social destination and confirm the branded preview and tappable URL survive.

## Rollout

1. Configure the production Android signing fingerprints.
2. Deploy the website changes and association endpoints.
3. Verify the production endpoints and representative Open Graph image.
4. Build and sync Capacitor dependencies.
5. Release through TestFlight and Android internal testing; perform lifecycle deep-link tests.
6. Submit the iOS and Android updates.
7. After the app releases, use canonical track URLs in announcements and share actions.

Website share cards and the non-autoplay landing page improve immediately after the web deploy. Automatic app opening begins only after users install a mobile build containing the new entitlements, manifest, and Capacitor plugins. Apple may cache associated-domain data, so verification is based on device behavior after a fresh app install rather than an immediate website-only change.

## Out of scope

- Deferred deep linking after a recipient installs the app.
- Custom URL schemes.
- Third-party smart-link or attribution services.
- Share-source analytics or campaign attribution.
- Lyrics, color selection, alternate card templates, or song-option selectors.
- Attaching the branded card as a standalone image file.
- New collection deep-link behavior or branded collection Open Graph images.
- Human-readable track slugs or URL migrations.
- Changes to visitor, free, or paid playback entitlements.

## Success criteria

1. Every track Share button and announcement link can use one canonical `https://www.hymnz.com/track/{id}` URL.
2. A valid link opens the installed iOS/Android app to the exact track landing page; without the app it opens the equivalent website page.
3. Opening the link never starts audio or consumes a free listen; one explicit Play tap starts the correct track.
4. The HYMNZ share sheet appears before system sharing and provides reliable Share and Copy link actions.
5. Messages and supported social destinations receive a branded preview containing artwork, title, artist, and HYMNZ branding.
6. Cold-start and already-running native app states both navigate correctly.
7. Invalid/inactive tracks, missing artwork, unavailable sharing, and failed native verification degrade safely as specified.
8. Automated tests, lint, production build, production endpoint checks, and device lifecycle tests pass before the mobile releases.
