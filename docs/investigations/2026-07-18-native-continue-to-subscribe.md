# Investigation Brief: Native "Continue to subscribe" button does nothing

> **For a fresh Claude Code session.** This is a self-contained kickoff. You have zero prior context — everything you need to start is here. **Use the `superpowers:systematic-debugging` skill** and do NOT propose fixes before completing root-cause investigation. This is a pre-existing bug, unrelated to the recently shipped "one free full listen" feature.

## Symptom

On the **native iOS app**, on the `/subscribe` screen (the native-only "HYMNZ Premium" variant), tapping the **"Continue to subscribe"** button does nothing — no browser opens, no visible error, no navigation. Reported by the app owner on a physical iPhone (iOS). Android behavior unconfirmed.

There is a screenshot in the conversation that produced this brief: it shows the native premium screen — HYMNZ Premium heading, a benefits list, a teal "Continue to subscribe" button, "Your subscription will sync automatically to this app.", and a "Maybe Later" link.

## Environment (verified facts)

- Native app is **Capacitor** wrapping a **remote webview that loads `https://www.hymnz.com`** as same-origin (`capacitor.config.ts`: `server.url = "https://www.hymnz.com"`, iOS `scheme: "https"`). `appId: "com.hymnz.app"`. So the webview shares cookies/session same-origin, and it runs **whatever is deployed to www.hymnz.com**, not a local bundle.
- Because it's a remote webview, JS changes require a **redeploy of www.hymnz.com**, not a `cap sync` — but **native plugin** changes (Browser, any custom `ExternalLink` plugin) DO require rebuilding/syncing the iOS app in Xcode.
- The native project lives under `ios/` (Capacitor). `npm run cap:sync:ios` syncs it.

## Exact code path (trace this first)

1. **Button** — `src/app/subscribe/page.tsx`, native branch guarded by `isNativeApp()` (~line 90). The button (~line 130-136):
   ```tsx
   <button onClick={() => openExternalLinkAccountWithHandoff("/subscribe")} ...>
     Continue to subscribe
   </button>
   ```
   Note: the `onClick` does **not** `await` or `catch` — an async rejection here is unhandled and silent.

2. **`openExternalLinkAccountWithHandoff(next)`** — `src/lib/utils/platform.ts` (~line 90-121):
   - If not native → `window.location.href = plainUrl` and return.
   - If native → `POST /api/auth/handoff/create` with `credentials: "include"`, get `{ token }`, then call `openExternalLinkAccount(exchangeUrl)` where `exchangeUrl = https://www.hymnz.com/api/auth/handoff/exchange?token=...&next=...`.
   - On any throw in the try block → falls through to `openExternalLinkAccount(plainUrl)`.

3. **`openExternalLinkAccount(url)`** — `platform.ts` (~line 61-80):
   - If `isIOS() && isNativeApp()` → try `window.Capacitor.Plugins.ExternalLink.open({ url })` (a **custom** plugin wrapping Apple's ExternalLinkAccount / reader-app disclosure). If the plugin is missing/throws → caught, falls through.
   - Otherwise → `openExternalBrowser(url)`.

4. **`openExternalBrowser(url)`** — `platform.ts` (~line 44-53):
   - Native → `const { Browser } = await import("@capacitor/browser"); await Browser.open({ url })`.
   - Web → `window.open(url, "_blank")`.

5. **Handoff endpoints exist**: `src/app/api/auth/handoff/create/route.ts` and `.../exchange/route.ts`. Confirm they respond as expected from the native webview (same-origin, cookies present).

## Leading hypotheses (rank/verify — do not fix yet)

1. **The custom `ExternalLink` plugin and/or `@capacitor/browser` is not registered in the iOS build**, so `openExternalLinkAccount`'s fallback chain throws (e.g. `import("@capacitor/browser")` rejects because the plugin isn't installed/synced into the native app), and because the `onClick` doesn't catch, it fails **silently** → "nothing happens." This is the most likely cause given the symptom (no error, no action). Check: is `@capacitor/browser` in `package.json` deps AND present in `ios/App/Podfile.lock` / synced? Is there a custom `ExternalLink` Swift plugin in `ios/`?
2. **Apple `ExternalLinkAccount` entitlement not approved / plugin present but `.open` throws**, and the Browser fallback also fails (see #1) → silent.
3. **`/api/auth/handoff/create` hangs or errors** in the native webview — but the code catches this and still calls the plain fallback, so this alone shouldn't cause "nothing." Verify anyway.
4. **The tap isn't reaching the handler** (overlay/z-index/safe-area) — less likely but cheap to rule out.

## How to get evidence (this needs a device or simulator)

You cannot reproduce this in the in-app desktop browser — `isNativeApp()` is false there, so the button uses the plain web path. You need the actual iOS app:

1. Run the app on an iOS simulator or device (open `ios/` in Xcode, or `npm run cap:open:ios`). It will load `https://www.hymnz.com`.
2. Attach **Safari → Develop → [device] → Web Inspector** to the app's webview. Tap "Continue to subscribe" and capture the **console** — an unhandled promise rejection or plugin error should appear here. This is the single highest-value piece of evidence; get it before theorizing further.
3. Check the Xcode console too (native-side errors from Capacitor plugins).
4. Inspect the native plugin registration: search `ios/` for `ExternalLink` (custom plugin) and confirm `@capacitor/browser` is installed and synced (`npx cap sync ios`, check `ios/App/Podfile.lock`).

## When you find root cause — fix direction (defense in depth)

Whatever the specific cause, the button should **never silently do nothing**. Likely fixes:
- Make the `onClick` handler `async` and wrap `openExternalLinkAccountWithHandoff` in try/catch that surfaces a visible error/toast on failure.
- Guarantee a working terminal fallback in `openExternalBrowser` (e.g. if the `@capacitor/browser` import fails, fall back to `window.open`/`window.location.href` so a URL always opens).
- Ensure the native plugins actually referenced (`ExternalLink`, `@capacitor/browser`) are installed and registered in the iOS project, or remove the dependency on a plugin that isn't there.

Add a failing repro (even a one-off: a temporary on-screen debug line logging which branch/await threw) before the fix, per systematic debugging.

## Constraints / notes

- Test credentials (if a logged-in state is needed): free `testuser@hymnz.com` / `TestPass123` (currently a paid Stripe subscriber in the DB), premium `premium@hymnz.com` / `TestPass123`. The `.env.local` `DATABASE_URL` may point at the shared/production DB — treat writes carefully and restore any test-fixture changes.
- Dev server: `npm run dev` (port 3333). But remember the bug only manifests in the native webview, not localhost.
- Do not conflate this with the free-listen feature. This button and `platform.ts` were untouched by that work.

## Success criteria

1. Root cause identified from actual device/simulator evidence (console error captured), not guessed.
2. Tapping "Continue to subscribe" on native reliably opens the external subscribe flow (Safari / reader disclosure) — or shows a clear error if it genuinely can't.
3. No silent failure path remains: the handler catches and surfaces errors, and there is always a terminal fallback that opens a URL.
