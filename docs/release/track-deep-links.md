# Track deep-link release checklist

This checklist is a release gate for canonical track links, verified app links, and branded sharing. Complete the local checks before deployment, then complete every production, device, and share-preview check before describing the feature as released.

## Production configuration

- [ ] In Play Console, open **Setup → App integrity → App signing key certificate** and copy the SHA-256 certificate fingerprint into `ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS` in the production deployment environment.
- [ ] If directly signed release builds must also open verified links, obtain their certificate fingerprint and append it to the environment value, separated by a comma:

  ```bash
  cd android && ./gradlew signingReport
  ```

- [ ] Confirm the production value contains only the intended Play App Signing and direct-release fingerprints; do not commit signing material or environment secrets.

## Website verification

After deploying the web application, run:

```bash
curl --fail --silent --show-error --dump-header /tmp/hymnz-aasa.headers --output /tmp/hymnz-aasa.json https://www.hymnz.com/.well-known/apple-app-site-association
curl --fail --silent --show-error --dump-header /tmp/hymnz-assetlinks.headers --output /tmp/hymnz-assetlinks.json https://www.hymnz.com/.well-known/assetlinks.json
curl --fail --silent --show-error --output /tmp/hymnz-track.html https://www.hymnz.com/track/sands-01
rg -n "HTTP/|content-type|location" /tmp/hymnz-aasa.headers /tmp/hymnz-assetlinks.headers
rg -n "og:url|og:image|twitter:image" /tmp/hymnz-track.html
```

- [ ] Both association endpoints return HTTP 200 with `Content-Type: application/json` and no `Location` header.
- [ ] The Apple association file contains the production app identifier and the Android association file contains `com.hymnz.app` plus the expected production signing fingerprints.
- [ ] The track page contains the canonical `https://www.hymnz.com/track/sands-01` Open Graph URL and the branded image URL in both `og:image` and `twitter:image` metadata.
- [ ] An unauthenticated request to the deployed Open Graph image URL returns the branded artwork/title/artist/HYMNZ image successfully.

## Android verification

With the internal-test app installed on a device, run:

```bash
adb shell pm set-app-links --package com.hymnz.app 0 all
adb shell pm verify-app-links --re-verify com.hymnz.app
adb shell pm get-app-links com.hymnz.app
adb shell am start -W -a android.intent.action.VIEW -d "https://www.hymnz.com/track/sands-01" com.hymnz.app
```

- [ ] `pm get-app-links` reports `www.hymnz.com` as verified.
- [ ] Opening the link with the app terminated, backgrounded, and foregrounded lands on the exact `sands-01` track page.
- [ ] The track is paused on arrival and begins correct playback after one tap on Play.

## iOS verification

- [ ] Install a fresh TestFlight build so the Associated Domains entitlement is newly evaluated.
- [ ] Send `https://www.hymnz.com/track/sands-01` through Messages and tap it with HYMNZ terminated, backgrounded, and foregrounded.
- [ ] In each state, the link opens the exact `sands-01` track page, paused, and correct playback starts after one tap on Play.
- [ ] Optionally run this simulator smoke test:

  ```bash
  xcrun simctl openurl booted "https://www.hymnz.com/track/sands-01"
  ```

## Fallback/share matrix

- [ ] Uninstall the iOS app and confirm the canonical link opens the same web track page, paused and ready to play after one Play tap.
- [ ] Uninstall the Android app and confirm the canonical link opens the same web track page, paused and ready to play after one Play tap.
- [ ] From web, iOS, and Android, share the track to Messages and to one social destination.
- [ ] In every destination, the preview consistently shows the track artwork, title, artist, and HYMNZ logo.
- [ ] In every destination, the canonical URL is tappable and opens the exact track without autoplay.
- [ ] In every destination, correct playback begins after one tap on Play.

Do not mark this release complete until all production configuration, deployed website, installed-app lifecycle, fallback, and share-preview checks above have passed.
