# Guest Subscribe Flow Streamlining — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the guest-to-premium path to the minimum steps on both native (register in-app, hand off signed in) and mobile web (checkout-framed register, auto-resumed checkout, premium card first).

**Architecture:** All changes are client-side in three files plus one new pure helper. A new `checkout-intent` util derives "the user was mid-checkout" from the `next` path and computes the post-auth destination; the register page uses it for copy and redirects; the subscribe page auto-fires checkout on `?checkout=1` arrivals and gives native visitors an in-app register detour instead of a signed-out Safari hand-off. No API/server changes.

**Tech Stack:** Next.js 16 App Router (client components), Tailwind v4, Vitest for the pure helper, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-07-18-guest-subscribe-flow-design.md`

**Compliance guardrail (read before Task 4):** The native app must never display subscription pricing, and checkout-framed copy must never appear in the native webview. This holds because only the web 401-redirect puts `plan=` into `next`; the native detour uses `next=/subscribe?welcome=1` (no plan). Do not add `plan` to any native-path URL.

---

### Task 1: `checkout-intent` helper (TDD)

**Files:**
- Create: `src/lib/utils/checkout-intent.ts`
- Test: `src/lib/utils/checkout-intent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/checkout-intent.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getPlanFromNext, getPostAuthUrl } from "./checkout-intent";

describe("getPlanFromNext", () => {
  it("extracts monthly from a subscribe next path", () => {
    expect(getPlanFromNext("/subscribe?plan=monthly")).toBe("monthly");
  });

  it("extracts yearly from a subscribe next path", () => {
    expect(getPlanFromNext("/subscribe?plan=yearly")).toBe("yearly");
  });

  it("returns null when no plan is present", () => {
    expect(getPlanFromNext("/subscribe")).toBeNull();
    expect(getPlanFromNext("/subscribe?welcome=1")).toBeNull();
    expect(getPlanFromNext("/")).toBeNull();
  });

  it("returns null for unknown plan values", () => {
    expect(getPlanFromNext("/subscribe?plan=lifetime")).toBeNull();
  });

  it("ignores plan params outside /subscribe", () => {
    expect(getPlanFromNext("/collection/abc?plan=monthly")).toBeNull();
  });
});

describe("getPostAuthUrl", () => {
  it("routes checkout intent to auto-resumed checkout", () => {
    expect(getPostAuthUrl("/subscribe?plan=monthly")).toBe(
      "/subscribe?plan=monthly&checkout=1"
    );
    expect(getPostAuthUrl("/subscribe?plan=yearly")).toBe(
      "/subscribe?plan=yearly&checkout=1"
    );
  });

  it("passes through paths without checkout intent", () => {
    expect(getPostAuthUrl("/")).toBe("/");
    expect(getPostAuthUrl("/subscribe?welcome=1")).toBe("/subscribe?welcome=1");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/utils/checkout-intent.test.ts`
Expected: FAIL — cannot resolve `./checkout-intent`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/checkout-intent.ts`:

```ts
export type CheckoutPlan = "monthly" | "yearly";

/**
 * Extract a checkout plan from a relative `next` path like
 * "/subscribe?plan=monthly". Only /subscribe paths carry checkout intent —
 * the web plan buttons' 401 redirect is the sole writer of `plan=`.
 */
export function getPlanFromNext(next: string): CheckoutPlan | null {
  if (!next.startsWith("/subscribe")) return null;
  const queryIndex = next.indexOf("?");
  if (queryIndex === -1) return null;
  const plan = new URLSearchParams(next.slice(queryIndex + 1)).get("plan");
  return plan === "monthly" || plan === "yearly" ? plan : null;
}

/**
 * Post-auth destination: straight to auto-resumed checkout when the user was
 * mid-checkout, otherwise the original `next`.
 */
export function getPostAuthUrl(next: string): string {
  const plan = getPlanFromNext(next);
  return plan ? `/subscribe?plan=${plan}&checkout=1` : next;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/utils/checkout-intent.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/checkout-intent.ts src/lib/utils/checkout-intent.test.ts
git commit -m "feat(subscribe): checkout-intent helper for post-auth resume"
```

---

### Task 2: Register page — checkout framing + post-auth redirects

**Files:**
- Modify: `src/app/auth/register/page.tsx`

All redirects and signin links switch from `next` to `postAuthUrl` so credential, Apple, and Google signups — and the sign-in path for existing users — all resume checkout. Copy switches to checkout framing only when a plan is present.

- [ ] **Step 1: Derive checkout intent**

In `src/app/auth/register/page.tsx`, add the import (after the `getSafeNextPath` import on line 9):

```tsx
import { getPlanFromNext, getPostAuthUrl } from "@/lib/utils/checkout-intent";
```

In `RegisterPageInner`, directly under `const next = getSafeNextPath(searchParams.get("next"));` (line 43), add:

```tsx
const checkoutPlan = getPlanFromNext(next);
const postAuthUrl = getPostAuthUrl(next);
```

- [ ] **Step 2: Route all post-auth redirects through `postAuthUrl`**

Five replacements in the same file (old → new):

In `handleSubmit` (lines 122–126):

```tsx
      if (result?.error) {
        window.location.href = `/auth/signin?next=${encodeURIComponent(postAuthUrl)}`;
      } else {
        window.location.href = postAuthUrl;
      }
```

In the Apple button handler: `window.location.href = next;` (line 167) → `window.location.href = postAuthUrl;` and `signIn("apple", { callbackUrl: next });` (line 177) → `signIn("apple", { callbackUrl: postAuthUrl });`

In the Google button handler: `window.location.href = next;` (line 200) → `window.location.href = postAuthUrl;` and `signIn("google", { callbackUrl: next });` (line 210) → `signIn("google", { callbackUrl: postAuthUrl });`

- [ ] **Step 3: Point the sign-in links at `postAuthUrl`**

"Sign in instead" link (line 373):

```tsx
                <Link
                  href={`/auth/signin?next=${encodeURIComponent(postAuthUrl)}`}
                  className="inline-block text-sm text-accent hover:underline"
                >
```

Bottom "Sign In" link (line 425):

```tsx
          <Link
            href={postAuthUrl !== "/" ? `/auth/signin?next=${encodeURIComponent(postAuthUrl)}` : "/auth/signin"}
            className="text-accent hover:underline"
          >
```

(No signin-page changes needed — it already redirects to the `next` it receives, so it inherits auto-resume through these links.)

- [ ] **Step 4: Checkout-framed copy**

Heading and subtitle (lines 145–151):

```tsx
          <h1 className="text-display text-2xl font-bold text-text-primary">
            {checkoutPlan ? "Almost There" : "Create Account"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {checkoutPlan
              ? "Create your account to continue to checkout"
              : "Start listening for free"}
          </p>
```

Submit button label (line 405):

```tsx
              (checkoutPlan ? "Create Account & Continue" : "Create Free Account")
```

(The surrounding ternary keeps the `Loader2` loading branch unchanged.)

- [ ] **Step 5: Lint and full test suite**

Run: `npm run lint && npm test`
Expected: no new lint errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/auth/register/page.tsx
git commit -m "feat(register): checkout framing and auto-resume redirect when arriving mid-checkout"
```

---

### Task 3: Subscribe page — auto-resume checkout on `?checkout=1`

**Files:**
- Modify: `src/app/subscribe/page.tsx`

- [ ] **Step 1: Add the auto-fire effect**

Update the react import (line 3):

```tsx
import { Suspense, useState, useEffect, useRef } from "react";
```

Under `const preselectedPlan ...` (line 27–28), add:

```tsx
  const autoCheckout = searchParams.get("checkout") === "1";
```

Directly **after** the `handleSubscribe` function definition (after line 70), add:

```tsx
  // Auto-resume checkout when arriving from signup/signin with a chosen plan
  // (?plan=...&checkout=1). Fires once; on failure the normal highlighted
  // plan button + error message remain as the manual fallback.
  const autoFired = useRef(false);
  useEffect(() => {
    if (autoFired.current) return;
    if (!autoCheckout || !preselectedPlan) return;
    if (isNativeApp() || tier !== "free") return;
    autoFired.current = true;
    handleSubscribe(preselectedPlan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, autoCheckout, preselectedPlan]);
```

Notes for the implementer:
- `tier` starts as `"visitor"` and flips to `"free"` when the `/api/user/subscription` fetch resolves — that transition is what triggers the effect post-signup.
- The `isNativeApp()` guard is belt-and-braces: the native branch renders different UI, and `checkout=1` is never set on native paths, but the effect lives above the branch so it must self-guard.
- `handleSubscribe` already shows the per-plan spinner (`loading` state), so the auto-fired run gets the same visual feedback as a tap.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors (the `eslint-disable-next-line` covers `handleSubscribe` not being a dependency).

- [ ] **Step 3: Commit**

```bash
git add src/app/subscribe/page.tsx
git commit -m "feat(subscribe): auto-resume checkout after auth with checkout=1"
```

---

### Task 4: Subscribe page — native visitor register detour + welcome note

**Files:**
- Modify: `src/app/subscribe/page.tsx` (native branch, lines ~92–180)

Reminder: no pricing and no `plan=` param anywhere in this task (see the compliance guardrail at the top).

- [ ] **Step 1: Import `CheckCircle`**

Update the lucide import (line 7):

```tsx
import { Check, Loader2, Crown, ExternalLink, Music, CheckCircle } from "lucide-react";
```

- [ ] **Step 2: Read the `welcome` param**

Under the `autoCheckout` line added in Task 3:

```tsx
  const welcome = searchParams.get("welcome") === "1";
```

- [ ] **Step 3: Welcome note in the native branch**

In the native branch, directly above the Crown heading block (`<div className="flex items-center justify-center gap-2 mb-2">`, line ~140), add:

```tsx
          {welcome && tier !== "visitor" && (
            <div className="glass rounded-xl px-4 py-3 mb-6 flex items-center justify-center gap-2">
              <CheckCircle size={16} className="text-accent shrink-0" />
              <span className="text-text-secondary text-sm">
                Account created — one more step
              </span>
            </div>
          )}
```

(`tier !== "visitor"` keeps the note from showing to a signed-out visitor who lands on a crafted `?welcome=1` URL, and from flashing before the tier fetch resolves.)

- [ ] **Step 4: Visitor detour on "Continue to subscribe"**

Replace the native button + caption (lines 161–170):

```tsx
          {tier === "visitor" ? (
            <Link
              href={`/auth/register?next=${encodeURIComponent("/subscribe?welcome=1")}`}
              className="block w-full py-3.5 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors text-center glow-accent"
            >
              Continue to subscribe
            </Link>
          ) : (
            <button
              onClick={() => openExternalLinkAccountWithHandoff("/subscribe")}
              className="w-full py-3.5 bg-accent-50 hover:bg-accent/60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 glow-accent"
            >
              <ExternalLink size={16} />
              Continue to subscribe
            </button>
          )}
          <p className="text-text-dim text-xs mt-3">
            {tier === "visitor"
              ? "You'll create a free account first, then finish on hymnz.com."
              : "Your subscription will sync automatically to this app."}
          </p>
```

(The visitor variant is in-app navigation, so it drops the `ExternalLink` icon; the signed-in variant is byte-identical to today's button. After signup the user returns here as `tier === "free"`, the Free card is already hidden by the existing `tier === "visitor"` guard, and the signed-in button drives the existing hand-off.)

- [ ] **Step 5: Lint and tests**

Run: `npm run lint && npm test`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/subscribe/page.tsx
git commit -m "feat(native): visitor Continue-to-subscribe registers in-app before signed-in handoff"
```

---

### Task 5: Premium card first on mobile web

**Files:**
- Modify: `src/app/subscribe/page.tsx` (web branch tier grid, lines ~208–248)

- [ ] **Step 1: Reorder cards on small screens**

Free card wrapper (line 210), add order utilities:

```tsx
          <div className="glass-heavy rounded-2xl p-6 border border-white/10 flex flex-col order-2 md:order-1">
```

Premium card wrapper (line 248):

```tsx
          <div className="glass-heavy rounded-2xl p-6 border border-accent/30 flex flex-col relative order-1 md:order-2">
```

(Mobile single-column: Premium renders first. At `md:` the explicit orders reproduce today's Free-left / Premium-right layout.)

- [ ] **Step 2: Commit**

```bash
git add src/app/subscribe/page.tsx
git commit -m "feat(subscribe): premium card first on mobile"
```

---

### Task 6: End-to-end web verification (browser)

No file changes — this task proves the flows in a real browser. **Cautions:** `.env.local` may point at the shared/production database, so use a clearly-marked throwaway email, leave the newsletter checkbox unchecked, and **stop at the Stripe checkout page — do not enter payment details or complete a purchase.**

- [ ] **Step 1: Full check**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 2: Start the dev server and open a mobile viewport**

Use the browser preview tooling (launch config on port 3333), sized to mobile (375×812). Open `http://localhost:3333/subscribe` signed out (clear cookies for localhost if needed).

- [ ] **Step 3: Verify card order (Task 5)**

Expected: Premium card ("Most Popular", "Start for $0.99") appears **above** the Free card on the mobile viewport, without scrolling past Free.

- [ ] **Step 4: Verify checkout framing (Task 2)**

Tap "Start for $0.99" while signed out.
Expected: redirected to `/auth/register?next=%2Fsubscribe%3Fplan%3Dmonthly`; the page reads "Almost There" / "Create your account to continue to checkout"; submit button reads "Create Account & Continue"; the bottom "Sign In" link href contains `checkout%3D1`.

- [ ] **Step 5: Verify auto-resume (Tasks 1–3)**

Register with a throwaway email (e.g. `flowtest-2026-07-18@example.com`, password 8+ chars, newsletter unchecked).
Expected: after submit, the browser lands on `/subscribe?plan=monthly&checkout=1`, the monthly button shows its spinner with **no tap**, and the page then redirects to a `checkout.stripe.com` URL. Stop there — close the tab without paying.

- [ ] **Step 6: Verify no-intent register is unchanged**

Open `/auth/register` directly (no `next`).
Expected: original copy — "Create Account" / "Start listening for free" / "Create Free Account".

- [ ] **Step 7: Verify the native branch guards (best-effort local check)**

The native branch renders only when Capacitor is present, so full verification happens on-device post-deploy (see checklist below). Locally, confirm by reading the diff that: the visitor button href is exactly `/auth/register?next=%2Fsubscribe%3Fwelcome%3D1` (no `plan=`), and the auto-fire effect has the `isNativeApp()` guard.

- [ ] **Step 8: Clean up**

Delete the throwaway account row (or flag it for the owner) so the shared DB stays tidy. Note it in the final report either way.

---

## Post-deploy device checklist (owner, after www.hymnz.com deploy)

The native app loads the remote site, so these changes ship with the web deploy — no `cap sync` or App Store update needed.

1. Fresh install / signed-out app → tap a premium CTA → native `/subscribe` → "Continue to subscribe" → lands on in-app register (copy: "Start listening for free" — **no** checkout framing, **no** pricing anywhere).
2. Sign up → returns to native `/subscribe` showing "Account created — one more step", Free card gone.
3. Tap "Continue to subscribe" → Apple disclosure sheet → Safari opens `/subscribe` **already signed in** (Free card shows "Current Plan"), Premium card first.
4. Tap a plan → straight to Stripe (no 401 / register bounce).
5. After completing checkout (test card if in test mode), return to app → still signed in; premium content unlocks.
