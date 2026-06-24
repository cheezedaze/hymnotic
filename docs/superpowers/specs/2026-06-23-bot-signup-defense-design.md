# Bot Signup Defense + Newsletter Double Opt-In — Design

**Date:** 2026-06-23
**Status:** Approved for planning

## Problem

The public email/password registration form (`/auth/register` → `POST /api/auth/register`)
has zero bot protection. A read-only audit (`scripts/audit-bot-signups.ts`) found:

- **38 of 82 "users" (46%) are almost certainly bots.** Signature: random base64-style
  names (`KRIgLssCUBhsCiQUfMM`) + heavy gmail-dot obfuscation (`g.a.ho.gu.k...@gmail.com`-style dotting).
- **The attack is live and escalating** — ~0/day before 2026-06-19, then 5 → 6 → 5 → 7 → 10
  bot signups/day through 2026-06-23.
- **36 of the 38 opted into the newsletter** and were pushed into the Resend audience.
- **Many addresses are real, scraped corporate/personal emails** (real-person addresses at
  domains like `uhaul.com`, `lallemand.com` — local-parts omitted; they're third-party PII).
  This is **subscription bombing**: emailing this list
  would generate spam complaints and damage HYMNZ's Resend sender reputation, hurting
  deliverability of legitimate email.

Two distinct risks, addressed separately:

1. **Junk accounts** — fixed by bot protection on the signup form.
2. **Email-reputation pollution** — fixed by newsletter double opt-in (self-cleaning list).

## Goals

- Stop automated signups through the web register form.
- Ensure newsletter subscribers are confirmed (double opt-in) before entering Resend.
- Purge the existing 38 confirmed-bot accounts from Resend and the DB.
- No regression to the native iOS/Android OAuth signup path.

## Non-Goals

- Email verification to *activate an account* (only the newsletter is gated, not login).
- Changing the authenticated profile newsletter toggle (it's already a trusted action).
- A bulletproof distributed rate limiter (explicitly chosen against — see Decisions).
- CAPTCHA on OAuth or other forms.

## Context that shaped the design

- **Mobile is OAuth-only.** `capacitor.config.ts` loads the remote site, and the native
  app signs up exclusively via `/api/auth/mobile/{google,apple}`. The email/password form
  is web-only, so **Turnstile goes on the web register form only** — no Capacitor risk.
- **Hosting is Vercel (serverless), DB on Railway.** In-memory rate limiting resets across
  cold starts / instances, so it is best-effort only. **Turnstile (stateless, server-verified)
  is the real defense.**

## Decisions (locked)

- **Rate limit:** in-memory best-effort, mirroring the existing
  `src/app/api/auth/forgot-password/route.ts` pattern. Cheap extra layer; Turnstile is the wall.
- **Cleanup:** remove the 38 bots from the Resend audience **and** delete their DB rows.
  They have zero engagement, so nothing real is lost. CSV (`scripts/bot-signup-candidates.csv`)
  is the saved record.

---

## Design

### Component 1 — Honeypot (signup form)

A hidden input real users never see/fill. Bots that blindly fill all fields trip it.

- **Client** (`src/app/auth/register/page.tsx`): add `<input>` named e.g. `company`,
  visually hidden (off-screen, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`).
  Include its value in the POST body.
- **Server** (`/api/auth/register`): if the honeypot field is non-empty → return `400`
  (generic "Failed to create account" — do not reveal the trap). No account created.
- Stateless; works on serverless; zero dependencies.

### Component 2 — Cloudflare Turnstile (the primary defense)

- **Env vars:**
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client widget)
  - `TURNSTILE_SECRET_KEY` (server verification)
- **Client:** render the Turnstile widget on the register form; capture the resulting token
  into state; include it in the POST body. Block submit if no token. Lightweight script
  injection (Cloudflare's `turnstile/v0/api.js`) — no heavy npm dependency required.
- **Server:** in `/api/auth/register`, **before** creating the user, POST the token +
  `TURNSTILE_SECRET_KEY` (+ client IP) to `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
  If `success !== true` → `400`. This step is stateless and serverless-safe.
- **Manual setup (user):** create a free Cloudflare account → Turnstile → create a widget for
  `hymnz.com` / `www.hymnz.com` (+ `localhost` for dev) → copy Site Key + Secret Key into
  `.env.local` and Vercel project env. Exact steps provided at implementation time.
- **Note:** the register page can technically render inside the Capacitor webview (remote URL),
  but mobile users are steered to native OAuth; Turnstile renders fine on the hymnz.com domain
  in a webview, so this is not a breakage risk.

### Component 3 — Rate limit (best-effort)

Reuse the sliding-window in-memory bucket from `forgot-password/route.ts`, keyed by client IP
(`x-forwarded-for` → `x-real-ip` → `"unknown"`). Suggested: max ~5 signup attempts per IP per
15 min. Checked after honeypot/Turnstile. Documented in-code as best-effort on serverless.

### Component 4 — Newsletter double opt-in

**Model:** `users.newsletterOptIn` continues to mean **confirmed subscriber** (what
`syncAllNewsletterContacts()` and the profile GET rely on). The new confirm-token table *is*
the "pending" state — no extra column needed.

**New table** `newsletter_confirm_tokens` (modeled on `passwordResetTokens`, via `db:push`):

| column      | type                                   |
|-------------|----------------------------------------|
| id          | serial PK                              |
| userId      | varchar(128) → users.id, onDelete cascade |
| tokenHash   | varchar(64) (sha256 of raw token)      |
| expiresAt   | timestamp (e.g. now + 7 days)          |
| usedAt      | timestamp nullable                     |
| createdAt   | timestamp default now                  |

Indexes: unique on `tokenHash`, index on `userId`.

**Register route change** (`/api/auth/register`): when `newsletterOptIn === true`:
- Do **not** call `addContactToNewsletter()` and do **not** set `users.newsletterOptIn = true`.
- Create a confirm token (store sha256 hash), send a "Confirm your HYMNZ subscription" email
  with a link to `/auth/confirm-newsletter?token=<raw>`.
- New email helper `sendNewsletterConfirmEmail(email, confirmUrl, name?)` in
  `src/lib/email/resend.ts`, modeled on `sendPasswordResetEmail`. Uses `EMAIL_FROM`.
- Account creation + auto-sign-in are unchanged.

**Confirm flow:** new page `src/app/auth/confirm-newsletter/page.tsx` reads the `token` query
param and renders a **"Confirm my subscription" button** that POSTs the token to a confirm
handler (route or server action). Confirmation happens on **POST, not on GET render** — this
prevents corporate email link-scanners (which auto-follow GET links) from falsely confirming a
subscription, which would defeat the purpose of double opt-in.

The confirm handler calls `confirmNewsletterToken(rawToken)` which:
- Looks up an unused, unexpired token by its hash; if invalid/expired → render a friendly
  "link expired — you can re-subscribe from your profile" message.
- On success: set `users.newsletterOptIn = true`, call `addContactToNewsletter(email, name)`,
  mark token `usedAt`. Render a success message.

**Untouched:** the authenticated profile toggle (`/api/user/newsletter` + `NewsletterToggle.tsx`)
stays as a direct add — a logged-in user toggling is already a confirmed, trusted action.

**UX note:** register success copy should mention "check your email to confirm your
newsletter subscription" when the box was ticked.

### Component 5 — Cleanup script (`scripts/cleanup-bot-signups.ts`)

Read-only by default (dry-run); destructive only with an explicit `--confirm` flag.

- Re-run the audit's `score >= 3` detection against the **current** DB (so newer bots are
  caught too), re-checking the protected/engaged exclusions at delete time (never delete an
  admin, premium/paying, or any account with plays/favorites/onboarding).
- For each confirmed bot:
  - Remove the contact from the Resend audience (`resend.contacts.remove`, audience from
    `RESEND_AUDIENCE_ID`).
  - Defensive re-check: confirm zero child rows (plays / play_events / favorites /
    onboarding_responses) before deleting the `users` row.
  - Delete the `users` row (cascade handles `newsletter_confirm_tokens`,
    `password_reset_tokens`, `auth_handoff_tokens`; `device_push_tokens` set-null).
- Print a summary; on dry-run, print exactly what *would* be deleted and stop.

---

## Files

**Add**
- `src/app/auth/confirm-newsletter/page.tsx` — confirmation landing page.
- `scripts/cleanup-bot-signups.ts` — purge script (dry-run + `--confirm`).
- `docs/superpowers/specs/2026-06-23-bot-signup-defense-design.md` — this spec.

**Modify**
- `src/lib/db/schema.ts` — add `newsletterConfirmTokens` table + types.
- `src/app/auth/register/page.tsx` — honeypot field, Turnstile widget, token in POST.
- `src/app/api/auth/register/route.ts` — honeypot check, Turnstile verify, rate limit,
  double-opt-in branch (token + confirm email instead of direct Resend add).
- `src/lib/email/resend.ts` — `sendNewsletterConfirmEmail`.
- `src/lib/email/newsletter.ts` — `confirmNewsletterToken` (or a new
  `src/lib/email/newsletter-confirm.ts` if cleaner).
- `.env.example` — document the two Turnstile env vars.

**Already added (audit step)**
- `scripts/audit-bot-signups.ts`, `scripts/bot-signup-candidates.csv`.

## Error handling & edge cases

- Turnstile/honeypot/rate-limit rejections all return a generic `400` (no info leak); no
  account row is created on rejection.
- Turnstile siteverify network error → fail closed (reject) with a generic error.
- Confirm token: invalid / expired / already-used → friendly page, no crash.
- Re-registering the same email is already blocked (409) and is unaffected.
- Confirm-email send failure → log; account still created (newsletter just stays unconfirmed);
  user can re-subscribe via profile toggle.

## Testing

- **Heuristics:** unit tests for `looksGibberish` / `gmailDotCount` (positive: audit samples;
  negative: real names like "John Smith", "Christopher", "McDonald").
- **Register route:** honeypot filled → 400, no insert; missing/invalid Turnstile → 400;
  valid path with `newsletterOptIn` → no Resend add, token row created, confirm email invoked
  (mock Resend); rate limit trips after N attempts.
- **Confirm:** valid token → `newsletterOptIn=true` + Resend add + token marked used;
  expired/invalid → friendly error, no state change.
- **Cleanup:** dry-run lists the right set and excludes protected/engaged; `--confirm` deletes
  from Resend + DB; verify a seeded "real" user is never selected.
- Implementation follows TDD (tests before code) per project workflow.

## Rollout / sequencing

1. Double opt-in + honeypot + rate limit (no external dependency) — can ship first.
2. Turnstile — after Cloudflare keys are provisioned (client + server + env).
3. Cleanup script — dry-run, eyeball output, then `--confirm`.

Prevention before cleanup, so we're not bailing water while the tap runs.

## Manual steps required from the user

- Provision Cloudflare Turnstile and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` +
  `TURNSTILE_SECRET_KEY` in `.env.local` and Vercel.
