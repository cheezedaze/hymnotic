# Guest Subscribe Flow Streamlining — Design

**Date:** 2026-07-18
**Status:** Approved by owner (explicit-tap hand-off variant)

## Problem

A guest who wants Premium hits far too many steps, on both entry points:

**Native app guest** (worst case today):
1. Taps "Continue to Subscribe" on the native `/subscribe` screen → Safari opens `hymnz.com/subscribe` **signed out** (the handoff has no session to carry for a visitor).
2. Scrolls past the Free card (mobile is single-column, Free first) to tap "Start for $0.99".
3. Checkout returns 401 → bounced to `/auth/register?next=/subscribe?plan=monthly`, where the page says "Start listening for free" and the button says **"Create Free Account"** — wrong messaging mid-purchase.
4. After signup, lands back on `/subscribe?plan=monthly` where the plan is merely highlighted — must **tap the plan a second time** to reach Stripe.
5. **Hidden defect:** the account was created in Safari, so the session lives in Safari, not the app's webview. Returning to the app, they are still a visitor and must sign in again before the subscription syncs.

**Mobile-web guest:** steps 2–4 apply identically.

The already-signed-in free-user native path is fine today (handoff carries the session; one tap on a plan reaches Stripe) — the pain is entirely the guest path.

## Apple compliance basis (verified 2026-07-18)

- Reader apps may offer **free-tier account creation in-app** (guideline 3.1.3(a)). The native `/subscribe` screen already does this.
- The External Link Account entitlement flow stays untouched: the link-out is a **user tap** on "Continue to subscribe", gated by Apple's disclosure sheet. We deliberately do **not** auto-fire the link after signup (rejected as review risk; costs one tap).
- **No pricing in the native app**, including URL parameters. Checkout-framed register copy keys off the `plan` query param, which only the web flow sets — it cannot leak into the native webview because the native detour never includes `plan`.

## Design

### A. Native guest: register in-app first, then hand off signed in

In the native branch of `src/app/subscribe/page.tsx`:

- When `tier === "visitor"`, "Continue to subscribe" becomes an **in-app navigation** to `/auth/register?next=` `/subscribe?welcome=1` (URL-encoded; no plan param), instead of calling `openExternalLinkAccountWithHandoff`.
- For `tier === "free"` (and any signed-in state), the button keeps its current behavior: `openExternalLinkAccountWithHandoff("/subscribe")`.
- After signup, the user lands back on native `/subscribe`, which already hides the Free card for non-visitors. The `welcome=1` param drives a small **"Account created — one more step"** confirmation note.
- The user taps "Continue to subscribe" → Apple disclosure sheet → Safari opens **already signed in** via the existing handoff → one tap on a plan → Stripe.
- On return to the app, the session already exists in the webview, so the subscription syncs without a re-login.

New native guest flow: Continue → in-app register → back on /subscribe with note → Continue → Apple sheet → Safari (signed in, Premium first) → plan tap → Stripe. No Safari signup, no double plan-tap, no re-login on return.

### B. Web checkout chain: checkout framing + auto-resume

In `src/app/auth/register/page.tsx`:

- When `next` contains a `plan=` value (i.e. the user arrived mid-checkout), switch the page framing: heading/subtitle along the lines of "Almost there — create your account to continue to checkout", and submit button **"Create Account & Continue"** instead of "Create Free Account". Without a plan in `next`, current copy stays.
- On successful signup with a plan in `next`, redirect to `/subscribe?plan=<plan>&checkout=1`.

In `src/app/subscribe/page.tsx` (web branch):

- When `checkout=1` and `plan` are present and the fetched tier resolves to `"free"`, **auto-fire `handleSubscribe(plan)`** once — the user lands in Stripe with zero additional taps. Show the existing per-plan loading state while it runs. If the checkout call fails, fall back to the current highlighted-button state with the error message, so the manual path always remains.
- Auto-fire must not loop: fire at most once per page load, and never for `tier === "paid"` or `"visitor"`.

### C. Premium card first on mobile web

In the web tier grid of `src/app/subscribe/page.tsx`, order the Premium card before Free on small screens (`order-*` utilities), preserving the current Free-left/Premium-right layout at `md:` and up. This serves both mobile-web browsers and handoff arrivals from the app.

## Out of scope

- No dedicated `/subscribe/premium` landing page (option C from brainstorm — rejected as unnecessary once card ordering is fixed).
- No auto-fired link-out after native signup (rejected for App Review risk).
- No reliance on US-storefront external-purchase rules (would allow in-app pricing but rests on injunction-era rules Apple is contesting).
- No reverse (Safari → app) session handoff — design A makes it unnecessary for this flow.

## Success criteria

1. Native guest reaches Stripe with: Continue → register form → Continue → Apple sheet → one plan tap. Returning to the app, they are signed in and premium syncs without re-login.
2. Mobile-web guest who taps a plan reaches Stripe with exactly one form (checkout-framed register) and zero repeat plan taps.
3. Native webview never displays pricing or checkout-framed copy (no `plan` param ever enters the native path).
4. Signed-in free-user flows (native handoff and web) behave exactly as today.
5. Auto-resume checkout fires at most once, and failure degrades to the current manual highlighted-plan state with a visible error.

## Test notes

- Web flows testable at `localhost` (dev port 3333+): visitor plan-tap → register framing → auto-resume → Stripe redirect URL.
- Native branch requires device/simulator (remote webview loads production; JS changes need a deploy of www.hymnz.com, not `cap sync`).
- Test accounts: free `testuser@hymnz.com` / `TestPass123`, premium `premium@hymnz.com` / `TestPass123`.
