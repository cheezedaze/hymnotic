# Bot Signup Defense + Newsletter Double Opt-In — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop automated bot signups on the web register form (honeypot + Cloudflare Turnstile + best-effort rate limit), make the newsletter self-cleaning via double opt-in, and purge the existing bot accounts from Resend + the DB.

**Architecture:** New pure-logic security module (`src/lib/security/`) holds bot-detection heuristics (unit-tested with vitest), Turnstile verification, and a reusable rate limiter. The register API route gains honeypot/rate-limit/Turnstile gates and switches the newsletter checkbox to a token-based confirm flow (no immediate Resend add). A public confirm page + API route complete double opt-in. A standalone cleanup script (dry-run by default) purges confirmed bots.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM + Postgres, Resend, Cloudflare Turnstile, vitest (new), tsx for scripts.

**Spec:** `docs/superpowers/specs/2026-06-23-bot-signup-defense-design.md`

**Branch:** `feat/bot-signup-defense` (already created; audit script + spec already committed).

**Env (already in `.env.local`, gitignored):** `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. The user must also add both to Vercel (Production + Preview).

---

## File Structure

**Create**
- `vitest.config.ts` — minimal vitest config (node env, `src/**/*.test.ts`).
- `src/lib/security/bot-detection.ts` — pure heuristics: `looksGibberish`, `gmailDotCount`, `gmailCanonical`. Used by the audit + cleanup scripts and tests. No DB imports.
- `src/lib/security/bot-detection.test.ts` — unit tests for the heuristics.
- `src/lib/security/turnstile.ts` — `verifyTurnstileToken(token, ip?)` server-side verification.
- `src/lib/security/rate-limit.ts` — reusable in-memory sliding-window `isRateLimited(key)`.
- `src/lib/email/newsletter-confirm.ts` — `createNewsletterConfirmToken`, `confirmNewsletterToken`.
- `src/components/auth/TurnstileWidget.tsx` — client Turnstile widget (explicit render, no npm dep).
- `src/app/auth/confirm-newsletter/page.tsx` — public confirm landing page (button POST).
- `src/app/api/newsletter/confirm/route.ts` — public POST handler that confirms the token.
- `scripts/cleanup-bot-signups.ts` — dry-run/`--confirm` purge of bot accounts.

**Modify**
- `package.json` — add `vitest` devDep + `test` script.
- `src/lib/db/schema.ts` — add `newsletterConfirmTokens` table + type.
- `src/lib/email/resend.ts` — add `sendNewsletterConfirmEmail`.
- `src/app/api/auth/register/route.ts` — honeypot, rate limit, Turnstile, double opt-in branch.
- `src/app/auth/register/page.tsx` — honeypot field, Turnstile widget, token in POST.
- `scripts/audit-bot-signups.ts` — import heuristics from the new module (DRY).
- `.env.example` — document the two Turnstile vars.

**No middleware change:** `/api/newsletter/confirm` and `/auth/confirm-newsletter` are not under any `PROTECTED_PATHS` prefix in `src/middleware.ts`, so they fall through as public. (Deliberately NOT placed under `/api/user`, which is protected.)

---

## Notes / decisions baked in

- **Turnstile fails open when unconfigured.** If `TURNSTILE_SECRET_KEY` is unset, `verifyTurnstileToken` returns true (logs a warning) so a missing env var can never lock out all signups. When the secret IS set, an invalid/missing token is rejected, and a network error to Cloudflare fails closed.
- **`users.newsletterOptIn` always set `false` at registration** now; it becomes `true` only on confirm. The token table is the "pending" state. The authenticated profile toggle (`/api/user/newsletter`) is unchanged.
- **No gibberish-name blocking at signup** — Turnstile is the gate; heuristics run only in the audit/cleanup scripts (human-reviewed / dry-run) to avoid false-blocking real users with unusual names.
- **The in-app "check your email" notice from the spec is intentionally omitted** to keep the existing auto-sign-in→redirect flow intact; the confirmation email's subject/body is the call to action. Easy to add later if desired.

---

### Task 1: vitest + extract bot-detection heuristics (TDD)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/security/bot-detection.ts`
- Test: `src/lib/security/bot-detection.test.ts`
- Modify: `scripts/audit-bot-signups.ts`

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`
Expected: `vitest` added to `devDependencies`.

- [ ] **Step 2: Add the test script**

In `package.json` `"scripts"`, add:

```json
    "test": "vitest run",
```

- [ ] **Step 3: Create vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Write the failing test**

`src/lib/security/bot-detection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { looksGibberish, gmailDotCount, gmailCanonical } from "./bot-detection";

describe("looksGibberish", () => {
  it("flags random base64-style bot names", () => {
    for (const n of [
      "KRIgLssCUBhsCiQUfMM",
      "EFpIvvZFSEQAlrBRdAgNvdhT",
      "wxBQYPsfsWDVdtGgoAFY",
      "CtohtmMcBMzUbYpJ",
    ]) {
      expect(looksGibberish(n)).toBe(true);
    }
  });

  it("does NOT flag real names", () => {
    for (const n of [
      "John Smith",
      "Mary",
      "Christopher",
      "McDonald",
      "JohnDoe",
      "Jean-Luc",
      "Sarah O'Brien",
      null,
      "",
    ]) {
      expect(looksGibberish(n)).toBe(false);
    }
  });
});

describe("gmailDotCount", () => {
  it("counts dots in gmail/googlemail local parts", () => {
    expect(gmailDotCount("g.a.ho.gu.k.342@gmail.com")).toBe(5);
    expect(gmailDotCount("a.j.u.h.a.pi4.0.4@gmail.com")).toBe(7);
    expect(gmailDotCount("normal@gmail.com")).toBe(0);
  });

  it("returns 0 for non-gmail domains", () => {
    expect(gmailDotCount("first.last@uhaul.com")).toBe(0);
    expect(gmailDotCount("a.b.c@yahoo.com")).toBe(0);
  });
});

describe("gmailCanonical", () => {
  it("strips dots and +suffix for gmail", () => {
    expect(gmailCanonical("j.e.re.m.y+news@gmail.com")).toBe("jeremy@gmail.com");
    expect(gmailCanonical("Normal@googlemail.com")).toBe("normal@gmail.com");
  });
  it("returns null for non-gmail", () => {
    expect(gmailCanonical("a@uhaul.com")).toBeNull();
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./bot-detection` (module does not exist yet).

- [ ] **Step 6: Create the implementation**

`src/lib/security/bot-detection.ts`:

```ts
/**
 * Pure heuristics for detecting bot/spam signups. NO side effects, NO DB —
 * safe to unit-test and to import from standalone scripts.
 */

/** Random base64-ish names like "KRIgLssCUBhsCiQUfMM" — NOT real names. */
export function looksGibberish(name: string | null): boolean {
  if (!name) return false;
  const n = name.trim();
  const letters = n.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 8) return false;
  const noSpace = !/\s/.test(n);
  const vowels = (n.match(/[aeiou]/gi) || []).length;
  const vowelRatio = vowels / letters.length;
  // Count lowercase -> uppercase transitions (camel-noise like xYxYxY).
  let caseFlips = 0;
  for (let i = 1; i < n.length; i++) {
    if (/[a-z]/.test(n[i - 1]) && /[A-Z]/.test(n[i])) caseFlips++;
  }
  return noSpace && (caseFlips >= 3 || vowelRatio < 0.25);
}

/** Number of dots in the local part of a gmail/googlemail address. */
export function gmailDotCount(email: string): number {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain || !/^(gmail\.com|googlemail\.com)$/.test(domain)) return 0;
  return (local.match(/\./g) || []).length;
}

/** Canonical gmail inbox (dots removed, +suffix stripped) for collision detection. */
export function gmailCanonical(email: string): string | null {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain || !/^(gmail\.com|googlemail\.com)$/.test(domain)) return null;
  return local.split("+")[0].replace(/\./g, "") + "@gmail.com";
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `bot-detection` tests green.

- [ ] **Step 8: Refactor the audit script to import the shared module (DRY)**

In `scripts/audit-bot-signups.ts`, delete the local `looksGibberish`, `gmailDotCount`, and `gmailCanonical` function definitions and replace them with an import near the top (after the existing imports):

```ts
import {
  looksGibberish,
  gmailDotCount,
  gmailCanonical,
} from "../src/lib/security/bot-detection";
```

(The module is pure with no `@/` or DB imports, so the relative path resolves under `tsx`.)

- [ ] **Step 9: Verify the audit script still runs**

Run: `DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx scripts/audit-bot-signups.ts`
Expected: same report as before (≈38 likely-bot), no errors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/security/bot-detection.ts src/lib/security/bot-detection.test.ts scripts/audit-bot-signups.ts
git commit -m "test: add vitest + extract bot-detection heuristics"
```

---

### Task 2: DB schema — newsletter confirm tokens

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add the table**

In `src/lib/db/schema.ts`, after the `passwordResetTokens` table definition (around line 257), add:

```ts
// =============================================================================
// Newsletter Confirm Tokens (double opt-in)
// =============================================================================
export const newsletterConfirmTokens = pgTable(
  "newsletter_confirm_tokens",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_newsletter_confirm_token_hash").on(table.tokenHash),
    index("idx_newsletter_confirm_user").on(table.userId),
  ]
);
```

- [ ] **Step 2: Add the type export**

Near the other `export type` lines at the bottom of the file, add:

```ts
export type NewsletterConfirmToken = typeof newsletterConfirmTokens.$inferSelect;
```

- [ ] **Step 3: Push the schema to the database**

Run: `npm run db:push`
Expected: drizzle-kit reports creating table `newsletter_confirm_tokens` + its indexes; applies cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(db): add newsletter_confirm_tokens table"
```

---

### Task 3: Security modules — Turnstile + rate limit

**Files:**
- Create: `src/lib/security/turnstile.ts`
- Create: `src/lib/security/rate-limit.ts`

- [ ] **Step 1: Create the Turnstile verifier**

`src/lib/security/turnstile.ts`:

```ts
const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Server-side Cloudflare Turnstile verification.
 * - Fails OPEN when TURNSTILE_SECRET_KEY is unset (so a missing env var never
 *   locks out all signups).
 * - When the secret IS set: a missing/invalid token is rejected, and a network
 *   error to Cloudflare fails CLOSED.
 */
export async function verifyTurnstileToken(
  token: string,
  ip?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn(
      "TURNSTILE_SECRET_KEY not set — skipping Turnstile verification"
    );
    return true;
  }
  if (!token) return false;

  try {
    const form = new URLSearchParams();
    form.append("secret", secret);
    form.append("response", token);
    if (ip && ip !== "unknown") form.append("remoteip", ip);

    const res = await fetch(VERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verify error:", err);
    return false;
  }
}
```

- [ ] **Step 2: Create the rate limiter**

`src/lib/security/rate-limit.ts`:

```ts
// Best-effort in-memory sliding-window limiter. On serverless (Vercel) this
// resets across cold starts / instances, so it is a cheap secondary layer —
// Turnstile is the real defense. Mirrors the pattern in forgot-password.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const buckets = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
  max: number = RATE_LIMIT_MAX
): boolean {
  const now = Date.now();
  const bucket = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  bucket.push(now);
  buckets.set(key, bucket);
  return bucket.length > max;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from these files.

- [ ] **Step 4: Commit**

```bash
git add src/lib/security/turnstile.ts src/lib/security/rate-limit.ts
git commit -m "feat(security): Turnstile verification + rate-limit helpers"
```

---

### Task 4: Newsletter confirm logic + email

**Files:**
- Modify: `src/lib/email/resend.ts`
- Create: `src/lib/email/newsletter-confirm.ts`

- [ ] **Step 1: Add the confirmation email**

In `src/lib/email/resend.ts`, after `sendPasswordResetEmail` (end of file), add:

```ts
export async function sendNewsletterConfirmEmail(
  email: string,
  confirmUrl: string,
  firstName?: string
) {
  const fromEmail = process.env.EMAIL_FROM || "HYMNZ <onboarding@resend.dev>";

  const resend = getResend();
  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Confirm your HYMNZ subscription",
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; color: #e0e0e0; background-color: #141A24;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: #00FFFB; margin: 0;">HYMNZ</h1>
        </div>
        <h2 style="font-size: 20px; color: #ffffff; margin-bottom: 16px;">Confirm Your Subscription</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #b0b0b0;">
          ${firstName ? `Hi ${firstName}, ` : ""}please confirm you'd like to receive updates about new music, collections, and HYMNZ news. Click the button below to subscribe.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmUrl}" style="display: inline-block; padding: 14px 32px; background-color: #00FFFB; color: #141A24; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 8px;">
            Confirm Subscription
          </a>
        </div>
        <p style="font-size: 13px; color: #888;">This link expires in 7 days. If you didn&rsquo;t sign up for HYMNZ, you can safely ignore this email &mdash; you won&rsquo;t be subscribed.</p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Create the confirm-token module**

`src/lib/email/newsletter-confirm.ts`:

```ts
import crypto from "crypto";
import { db } from "@/lib/db";
import { users, newsletterConfirmTokens } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { addContactToNewsletter } from "@/lib/email/newsletter";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Create a single-use confirm token for a user. Invalidates any prior unused
 * tokens for the same user. Returns the RAW token (only the hash is stored).
 */
export async function createNewsletterConfirmToken(
  userId: string
): Promise<string> {
  await db
    .update(newsletterConfirmTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(newsletterConfirmTokens.userId, userId),
        isNull(newsletterConfirmTokens.usedAt)
      )
    );

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .insert(newsletterConfirmTokens)
    .values({ userId, tokenHash, expiresAt });

  return token;
}

export type ConfirmResult =
  | "confirmed"
  | "invalid"
  | "expired"
  | "already";

/**
 * Validate a raw confirm token and, on success, add the user to the Resend
 * audience and mark them a confirmed subscriber. Resend add happens BEFORE the
 * token is marked used, so a Resend failure (which throws) leaves the token
 * reusable for a retry.
 */
export async function confirmNewsletterToken(
  rawToken: string
): Promise<ConfirmResult> {
  if (!rawToken) return "invalid";
  const tokenHash = sha256Hex(rawToken);

  const rows = await db
    .select()
    .from(newsletterConfirmTokens)
    .where(eq(newsletterConfirmTokens.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row) return "invalid";
  if (row.usedAt) return "already";
  if (row.expiresAt.getTime() < Date.now()) return "expired";

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  const user = userRows[0];
  if (!user) return "invalid";

  await addContactToNewsletter(user.email, user.name ?? undefined);

  await db
    .update(users)
    .set({ newsletterOptIn: true, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await db
    .update(newsletterConfirmTokens)
    .set({ usedAt: new Date() })
    .where(eq(newsletterConfirmTokens.id, row.id));

  return "confirmed";
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email/resend.ts src/lib/email/newsletter-confirm.ts
git commit -m "feat(email): newsletter double opt-in token + confirm email"
```

---

### Task 5: Register API route — gates + double opt-in

**Files:**
- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Replace the route with the gated version**

Replace the entire contents of `src/app/api/auth/register/route.ts` with:

```ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createNewsletterConfirmToken } from "@/lib/email/newsletter-confirm";
import { sendNewsletterConfirmEmail } from "@/lib/email/resend";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { isRateLimited } from "@/lib/security/rate-limit";

const HONEYPOT_FIELD = "company";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, newsletterOptIn, turnstileToken } = body;
    const honeypot = body[HONEYPOT_FIELD];

    // 1. Honeypot — real users never fill this hidden field. Generic error.
    if (typeof honeypot === "string" && honeypot.trim() !== "") {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // 2. Best-effort rate limit by IP.
    if (isRateLimited(`register:${ip}`)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    // 3. Turnstile (enforced when configured; fails open when unconfigured).
    const turnstileOk = await verifyTurnstileToken(
      typeof turnstileToken === "string" ? turnstileToken : "",
      ip
    );
    if (!turnstileOk) {
      return NextResponse.json(
        { error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser[0]) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    // newsletterOptIn stays false until the user confirms (double opt-in).
    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      name: name?.trim() || null,
      passwordHash,
      role: "USER",
      accountTier: "free",
      isPremium: false,
      newsletterOptIn: false,
    });

    // 4. Double opt-in: send a confirm email instead of adding to Resend now.
    if (newsletterOptIn === true) {
      try {
        const token = await createNewsletterConfirmToken(userId);
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333";
        const confirmUrl = `${appUrl}/auth/confirm-newsletter?token=${token}`;
        await sendNewsletterConfirmEmail(
          normalizedEmail,
          confirmUrl,
          name?.trim() || undefined
        );
      } catch (err) {
        console.error("Failed to send newsletter confirmation email:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify honeypot rejection (server, no Turnstile needed)**

Start the dev server in one shell: `npm run dev`
Then run:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3333/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"hp@example.com","password":"TestPass123","company":"botfill"}'
```

Expected: `400` (honeypot tripped — no user created).

- [ ] **Step 3: Verify a clean signup still works (Turnstile fails open if secret unset locally, or pass a real token)**

```bash
curl -s -w "\n%{http_code}\n" -X POST http://localhost:3333/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Real Person","email":"plan-test@example.com","password":"TestPass123","newsletterOptIn":false}'
```

Expected: `{"success":true}` and `200`. (If `TURNSTILE_SECRET_KEY` is set locally, include a valid `turnstileToken`; otherwise it fails open.) Then delete the test row:

```bash
DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx -e "import('postgres').then(async ({default:pg})=>{const sql=pg(process.env.DATABASE_URL);await sql\`delete from users where email='plan-test@example.com'\`;await sql.end();console.log('cleaned');})"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat(auth): honeypot + rate limit + Turnstile + double opt-in on register"
```

---

### Task 6: Register page — honeypot + Turnstile widget

**Files:**
- Create: `src/components/auth/TurnstileWidget.tsx`
- Modify: `src/app/auth/register/page.tsx`

- [ ] **Step 1: Create the Turnstile widget component**

`src/components/auth/TurnstileWidget.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
        }
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    function render() {
      if (!ref.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
        theme: "dark",
      });
    }

    if (window.turnstile) {
      render();
      return;
    }
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
      return;
    }
    // Script tag present but not loaded yet — poll briefly.
    const t = setInterval(() => {
      if (window.turnstile) {
        clearInterval(t);
        render();
      }
    }, 200);
    return () => clearInterval(t);
  }, [siteKey, onToken]);

  return <div ref={ref} className="flex justify-center" />;
}
```

- [ ] **Step 2: Wire it into the register page**

In `src/app/auth/register/page.tsx`:

(a) Add imports after the existing `import` lines (top of file):

```tsx
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
```

(b) Add state alongside the other `useState` calls (after `const [newsletterOptIn, ...]`):

```tsx
  const [company, setCompany] = useState(""); // honeypot — must stay empty
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
```

(c) In `handleSubmit`, after the `password !== confirmPassword` check and before `setLoading(true)`, add the Turnstile guard:

```tsx
    if (turnstileSiteKey && !turnstileToken) {
      setError("Please complete the verification below.");
      return;
    }
```

(d) Change the fetch body to include the honeypot + token:

```tsx
        body: JSON.stringify({
          name,
          email,
          password,
          newsletterOptIn,
          company,
          turnstileToken,
        }),
```

(e) Add the honeypot input inside the `<form>` — put it immediately after the opening `<form ...>` tag, before the Name field. It is positioned off-screen and hidden from assistive tech and tab order:

```tsx
          {/* Honeypot — real users never see or fill this */}
          <input
            type="text"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              width: "1px",
              height: "1px",
              opacity: 0,
            }}
          />
```

(f) Add the Turnstile widget inside the `<form>`, immediately before the submit `<button type="submit" ...>`:

```tsx
          {turnstileSiteKey && (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              onToken={setTurnstileToken}
            />
          )}
```

- [ ] **Step 3: Verify in the browser**

With `npm run dev` running, open `http://localhost:3333/auth/register`.
Expected: the Turnstile widget renders below the form fields (if `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set), no console errors, and the honeypot field is not visible. Complete a signup with a throwaway email and confirm it succeeds; then delete that row as in Task 5 Step 3.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/TurnstileWidget.tsx src/app/auth/register/page.tsx
git commit -m "feat(auth): honeypot field + Turnstile widget on register form"
```

---

### Task 7: Confirm page + API route (double opt-in landing)

**Files:**
- Create: `src/app/api/newsletter/confirm/route.ts`
- Create: `src/app/auth/confirm-newsletter/page.tsx`

- [ ] **Step 1: Create the confirm POST handler**

`src/app/api/newsletter/confirm/route.ts`:

```ts
import { NextResponse } from "next/server";
import { confirmNewsletterToken } from "@/lib/email/newsletter-confirm";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") || "");

  let status: string;
  try {
    status = await confirmNewsletterToken(token);
  } catch (err) {
    console.error("Newsletter confirm failed:", err);
    status = "error";
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333";
  return NextResponse.redirect(
    `${appUrl}/auth/confirm-newsletter?status=${status}`,
    { status: 303 }
  );
}
```

- [ ] **Step 2: Create the confirm landing page**

`src/app/auth/confirm-newsletter/page.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";

type Search = { token?: string; status?: string };

const MESSAGES: Record<string, { heading: string; body: string }> = {
  confirmed: {
    heading: "You're subscribed!",
    body: "Thanks for confirming. You'll now receive updates about new music, collections, and HYMNZ news.",
  },
  already: {
    heading: "Already confirmed",
    body: "This subscription was already confirmed. You're all set.",
  },
  expired: {
    heading: "Link expired",
    body: "This confirmation link has expired. You can re-subscribe anytime from your profile settings.",
  },
  invalid: {
    heading: "Invalid link",
    body: "This confirmation link isn't valid. You can subscribe from your profile settings.",
  },
  error: {
    heading: "Something went wrong",
    body: "We couldn't confirm your subscription just now. Please try again in a moment.",
  },
};

export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { token, status } = await searchParams;

  return (
    <div className="min-h-dvh bg-midnight flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/images/hymnz-logo1.png"
            alt="HYMNZ"
            width={80}
            height={80}
            className="mb-3 w-20 h-20"
          />
          <h1 className="text-display text-2xl font-bold text-text-primary">
            Newsletter
          </h1>
        </div>

        <div className="glass-heavy rounded-2xl p-6">
          {status ? (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                {(MESSAGES[status] ?? MESSAGES.invalid).heading}
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                {(MESSAGES[status] ?? MESSAGES.invalid).body}
              </p>
              <Link
                href="/"
                className="inline-block mt-6 py-3 px-6 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors"
              >
                Continue to HYMNZ
              </Link>
            </>
          ) : token ? (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Confirm your subscription
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                Click below to start receiving updates about new music,
                collections, and HYMNZ news.
              </p>
              <form action="/api/newsletter/confirm" method="POST">
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  className="w-full py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors"
                >
                  Confirm Subscription
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Invalid link
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                This confirmation link is missing its token.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: End-to-end verify the confirm flow**

With `npm run dev` running, generate a token for an existing test user and walk the flow:

```bash
# Create a token for the free test user and print the confirm URL
DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx -e "
import('./src/lib/email/newsletter-confirm.ts').then(async (m) => {
  import('postgres').then(async ({default:pg}) => {
    const sql = pg(process.env.DATABASE_URL);
    const [u] = await sql\`select id from users where email='testuser@hymnz.com'\`;
    await sql.end();
    const t = await m.createNewsletterConfirmToken(u.id);
    console.log('http://localhost:3333/auth/confirm-newsletter?token=' + t);
  });
});
"
```

Open the printed URL in the browser → you should see the "Confirm your subscription" button → click it → redirected to `?status=confirmed` showing "You're subscribed!". Verify in DB that `newsletterOptIn` is now true for that user, then reset it:

```bash
DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx -e "import('postgres').then(async ({default:pg})=>{const sql=pg(process.env.DATABASE_URL);await sql\`update users set newsletter_opt_in=false where email='testuser@hymnz.com'\`;await sql\`delete from newsletter_confirm_tokens where user_id=(select id from users where email='testuser@hymnz.com')\`;await sql.end();console.log('reset');})"
```

(Note: confirming also adds the contact to Resend. If you want to keep Resend clean during testing, remove that contact from the Resend dashboard afterward, or use a test email you don't mind.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/newsletter/confirm/route.ts src/app/auth/confirm-newsletter/page.tsx
git commit -m "feat(newsletter): public double opt-in confirm page + handler"
```

---

### Task 8: Document env vars

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add the Turnstile vars**

Append to `.env.example`:

```
# Cloudflare Turnstile (bot protection on the web signup form)
# Create a free widget at https://dash.cloudflare.com → Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA_site_key
TURNSTILE_SECRET_KEY=0x4AAAAAAA_secret_key
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document Turnstile env vars"
```

---

### Task 9: Cleanup script (dry-run + --confirm)

**Files:**
- Create: `scripts/cleanup-bot-signups.ts`

- [ ] **Step 1: Create the cleanup script**

`scripts/cleanup-bot-signups.ts`:

```ts
/**
 * Purge confirmed bot signups from Resend + the DB.
 * DRY-RUN by default — prints what it WOULD delete and exits.
 * Pass --confirm to actually delete.
 *
 * Run (dry-run):
 *   DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx scripts/cleanup-bot-signups.ts
 * Run (delete):
 *   DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx scripts/cleanup-bot-signups.ts --confirm
 */
import postgres from "postgres";
import { Resend } from "resend";
import {
  looksGibberish,
  gmailDotCount,
  gmailCanonical,
} from "../src/lib/security/bot-detection";

type Row = {
  id: string;
  email: string;
  name: string | null;
  has_password: boolean;
  role: string;
  is_premium: boolean;
  manual_premium: boolean;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  plays: number;
  play_events: number;
  favorites: number;
  onboarding_rows: number;
  dismissals: number;
};

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const rows = await sql<Row[]>`
    select
      u.id, u.email, u.name,
      u.password_hash is not null as has_password,
      u.role, u.is_premium, u.manual_premium,
      u.stripe_customer_id, u.subscription_status,
      (select count(*)::int from user_track_plays p where p.user_id = u.id) as plays,
      (select count(*)::int from play_events e where e.user_id = u.id) as play_events,
      (select count(*)::int from user_favorites f where f.user_id = u.id) as favorites,
      (select count(*)::int from onboarding_responses o where o.user_id = u.id) as onboarding_rows,
      (select count(*)::int from announcement_dismissals d where d.user_id = u.id) as dismissals
    from users u
    order by u.created_at asc
  `;

  const isProtected = (r: Row) =>
    r.role === "ADMIN" ||
    r.is_premium ||
    r.manual_premium ||
    !!r.stripe_customer_id ||
    (r.subscription_status != null &&
      ["active", "trialing", "past_due"].includes(r.subscription_status));

  const hasChildRows = (r: Row) =>
    r.plays > 0 ||
    r.play_events > 0 ||
    r.favorites > 0 ||
    r.onboarding_rows > 0 ||
    r.dismissals > 0;

  // gmail inbox collisions
  const canonMap = new Map<string, number>();
  for (const r of rows) {
    const c = gmailCanonical(r.email);
    if (c) canonMap.set(c, (canonMap.get(c) ?? 0) + 1);
  }

  const score = (r: Row): number => {
    let s = 0;
    if (looksGibberish(r.name)) s += 3;
    if (gmailDotCount(r.email) >= 4) s += 2;
    const c = gmailCanonical(r.email);
    if (c && (canonMap.get(c) ?? 0) > 1) s += 2;
    return s;
  };

  // A row is a delete candidate only if it scores >= 3 AND is neither
  // protected nor shows any engagement — re-checked here at delete time.
  const targets = rows.filter(
    (r) => score(r) >= 3 && !isProtected(r) && !hasChildRows(r)
  );

  console.log(`\n=== CLEANUP ${CONFIRM ? "(LIVE)" : "(DRY-RUN)"} ===`);
  console.log(`Total users: ${rows.length}`);
  console.log(`Delete candidates: ${targets.length}\n`);
  for (const t of targets) {
    console.log(`  ${JSON.stringify(t.name)}  <${t.email}>`);
  }

  if (!CONFIRM) {
    console.log(`\nDRY-RUN — nothing deleted. Re-run with --confirm to delete.\n`);
    await sql.end();
    return;
  }

  let resendRemoved = 0;
  let dbDeleted = 0;
  for (const t of targets) {
    // Remove from Resend (best-effort; missing contact is fine).
    try {
      const { data: contact } = await resend.contacts.get({
        email: t.email,
      } as Parameters<typeof resend.contacts.get>[0]);
      if (contact?.id) {
        await resend.contacts.remove({
          id: contact.id,
        } as Parameters<typeof resend.contacts.remove>[0]);
        resendRemoved += 1;
      }
    } catch (e) {
      console.warn(`  Resend remove failed for ${t.email}:`, (e as Error).message);
    }

    // Delete the user row (cascades handle tokens; child rows already 0).
    await sql`delete from users where id = ${t.id}`;
    dbDeleted += 1;
  }

  console.log(`\nDeleted ${dbDeleted} users; removed ${resendRemoved} Resend contacts.\n`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run the dry-run and eyeball the output**

Run: `DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx scripts/cleanup-bot-signups.ts`
Expected: prints ~38 delete candidates (all gibberish-name/bot rows), and "DRY-RUN — nothing deleted." Confirm no real-looking, engaged, or premium accounts appear in the list.

- [ ] **Step 3: Commit the script (do NOT run --confirm yet)**

```bash
git add scripts/cleanup-bot-signups.ts
git commit -m "feat(scripts): bot-signup cleanup (dry-run + --confirm)"
```

The actual `--confirm` purge is an operational step to run WITH the user after they've reviewed the dry-run output — see Task 10.

---

### Task 10: Final verification + operational cleanup

- [ ] **Step 1: Full test + typecheck + lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: tests pass, no type errors, lint clean (or only pre-existing warnings unrelated to these files).

- [ ] **Step 2: Confirm Turnstile is enforced in a real browser**

With `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` set locally (or on a Vercel preview), load `/auth/register`, complete the widget, and register a throwaway account → success. Then try submitting with the widget incomplete → blocked client-side; and verify the server rejects a forged request with no `turnstileToken` (expect `400`):

```bash
curl -s -w "\n%{http_code}\n" -X POST http://localhost:3333/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"x","email":"forge-test@example.com","password":"TestPass123"}'
```

Expected (when secret key IS set locally): `400` "Verification failed." Delete any throwaway rows created.

- [ ] **Step 3: Run the cleanup for real (with the user)**

After the user confirms the dry-run list looks right:

Run: `DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx scripts/cleanup-bot-signups.ts --confirm`
Then re-run the audit to confirm the bot population is gone:
Run: `DOTENV_CONFIG_PATH=.env.local NODE_OPTIONS='-r dotenv/config' npx tsx scripts/audit-bot-signups.ts`
Expected: "LIKELY BOT" count drops to ~0.

- [ ] **Step 4: Reminder — set Turnstile env vars in Vercel**

Ensure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set in the Vercel project (Production + Preview) before/at deploy, or Turnstile fails open in production (no protection).

- [ ] **Step 5: Finish the branch**

Use the finishing-a-development-branch skill to open a PR for `feat/bot-signup-defense`.

---

## Self-Review (completed)

- **Spec coverage:** honeypot (T5/T6), Turnstile (T3/T5/T6), rate limit (T3/T5), double opt-in token table (T2) + confirm email (T4) + confirm page/handler (T7) + register branch (T5), cleanup (T9/T10), env docs (T8), tests for heuristics (T1). All spec sections mapped.
- **Placeholder scan:** every code step contains complete code; no TBD/TODO.
- **Type consistency:** `verifyTurnstileToken`, `isRateLimited`, `createNewsletterConfirmToken`, `confirmNewsletterToken`/`ConfirmResult`, `looksGibberish`/`gmailDotCount`/`gmailCanonical`, `newsletterConfirmTokens`, `sendNewsletterConfirmEmail`, `TurnstileWidget` props (`siteKey`/`onToken`), honeypot field name `company` — all consistent across tasks.
