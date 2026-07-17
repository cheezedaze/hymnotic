# Another Testament Promo Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public promo page at `hymnz.com/another-testament` (bio link for the IG/TikTok video release, live before Sunday 2026-07-20 1 PM Mountain) with an embedded YouTube trailer, a one-free-listen "Carry On" player, ArtVue art section, Book of Mormon section, and visit→listen→registration analytics.

**Architecture:** A server component page (outside auth, inside the existing AppShell like `/privacy`) fetches the `carry-on` track from Postgres and hands the direct CDN audio URL to a self-contained client player (own `HTMLAudioElement`, NOT the global Zustand player — the global player would impose 30s visitor previews). The free-listen gate is client-side localStorage (soft gate, decided in brainstorm). Attribution: middleware stamps a `hymnz_ref` cookie on promo-page visits; the register route (and OAuth upsert, best-effort) copies it to a new `users.signup_ref` column. Anonymous listens become recordable by making `play_events.user_id` nullable + adding a `source` column, written via a new `/api/promo/play` endpoint. Page views come from `@vercel/analytics` added to the root layout.

**Tech Stack:** Next.js 16 App Router (src/), Tailwind v4 custom utilities (`glass`, `glass-heavy`, `text-display`, `gradient-divider`), Drizzle ORM + `npm run db:push` (repo does NOT use migrations), Vitest, lucide-react.

**Spec:** `brainstorms/2026-07-16-video-promo-page.md` (all decisions), plus codebase findings below.

## Key codebase facts (verified 2026-07-16)

- Track `carry-on`: collection `epics`, `artwork_key images/artwork/Carry-On-1776374689799.jpg`, `audio_key audio/tracks/Master_Carry-Onmixdown-1771529276969.mp3`, **`duration` is 0 in DB — real duration is 242s** (measured from CDN file). Not Sacred 7, not featured → free users normally get only a 60s preview; visitors 30s.
- CDN: `getMediaUrl(key)` in `src/lib/s3/client.ts:41` → `https://d2y722s9xxtvrs.cloudfront.net/<key>` (objects publicly fetchable; server gate is `/api/tracks/[id]/audio`, which we bypass deliberately by handing the CDN URL server-side — same pattern the home page uses for the featured track).
- `getTrackById(id)` at `src/lib/db/queries.ts:122`; `incrementPlayCount` at `:131`; `recordPlayEvent(userId, trackId)` at `:883` (userId currently required).
- `play_events` schema at `src/lib/db/schema.ts:330-347` — `user_id` NOT NULL today.
- `users` schema at `src/lib/db/schema.ts:170-196` — no attribution column today.
- Register route `src/app/api/auth/register/route.ts` — insert at lines 87-96. OAuth signups bypass it via `src/lib/auth/oauth-upsert.ts` (insert at line 49).
- Middleware `src/middleware.ts` — `/another-testament` is public by default (only PROTECTED_PATHS are gated); matcher runs on the route, so it can set the ref cookie.
- Root layout `src/app/layout.tsx` wraps everything in `<AppShell>`; `/privacy` (`src/app/privacy/page.tsx`) is the static-page pattern to match: `min-h-dvh bg-midnight`, `glass-heavy rounded-2xl` cards, `text-display` headings.
- Standalone player template: `src/lib/hooks/useAdminAudioPlayer.ts` (own `new Audio()`, isolated from global store).
- YouTube helpers exist: `src/lib/utils/youtube.ts`. Video ID: `-dkI0pXWc_w` (private until Sunday; embed testable once unlisted).
- Vitest: `npm test`, node environment, tests live as `src/**/*.test.ts`.
- No analytics package installed anywhere.

## Copy (final, from brainstorm — user's own words)

- Title: **Another Testament of Jesus Christ** / subtitle: *A Book of Mormon Trailer*
- Hook: "A visual and musical testimony of the book that changed my life."
- Intro paragraph: "This cinematic trailer brings together three things close to my heart: the profound stories of the Book of Mormon, epic music, and original digital art. Every frame of artwork featured in this trailer is part of a larger collection celebrating scripture, light, and faith. The music was created for another passion project reimagining hymns in different genres—I arranged the hymn track first and built the entire trailer around it."
- Music blurb: "Featuring an epic hymn arrangement of 'Carry On' exclusively on HYMNZ. Discover more uplifting, fun, motivating, and epic arrangements of sacred music."
- Credits: "Lyrics: Ruth May Fox, 1853–1958. Music: A. Sherman Tingey, 1864–1924. © 1948 IRI"
- Book of Mormon testimony: "The Book of Mormon has been a pivotal anchor in my life. When I first met with the missionaries and read it at the age of 20, my life did a complete 180. It has been the foundation of my faith in Jesus Christ for the 30 years since." + "If you've never read it, or want to explore it deeper, you can download the app or request a free physical copy delivered right to your door."
- Links: YouTube `https://youtu.be/-dkI0pXWc_w` · ArtVue `https://www.artvue.io/collection/6a582bfca898ff72c478af63` · BoM app `https://www.churchofjesuschrist.org/learn/mobile-applications/book-of-mormon-app` · Free copy `https://www.churchofjesuschrist.org/comeuntochrist/ps/book-of-mormon-lesson`

---

### Task 0: Branch + assets

The user already placed 3 large originals in `public/images/promo/`: `Jesus-blesses.jpg` (2912×1632, 1.0 MB), `Moroni-Hill.jpg` (3036×1708, 0.5 MB), `alma-friends1.png` (3344×1882, 5.4 MB). Resize to web weight, normalize names, and derive an OG image. Originals must NOT be committed.

**Files:**
- Create: `public/images/promo/jesus-blesses.jpg`, `public/images/promo/moroni-hill.jpg`, `public/images/promo/alma-friends.jpg`, `public/images/promo/og-another-testament.jpg` (all resized)
- Delete (after resizing): the 3 originals

- [ ] **Step 1: Create branch off main**

```bash
git checkout main && git pull && git checkout -b feat/another-testament-promo
```

- [ ] **Step 2: Resize with sips (macOS), longest edge 1600px, JPEG ~80%**

```bash
cd public/images/promo
sips -Z 1600 -s format jpeg -s formatOptions 80 Jesus-blesses.jpg --out jesus-blesses.jpg
sips -Z 1600 -s format jpeg -s formatOptions 80 Moroni-Hill.jpg --out moroni-hill.jpg
sips -Z 1600 -s format jpeg -s formatOptions 80 alma-friends1.png --out alma-friends.jpg
# OG image: 1200 wide from the close-up (reads best small), then crop to 1200x630
sips -Z 1200 -s format jpeg -s formatOptions 80 Jesus-blesses.jpg --out og-another-testament.jpg
sips -c 630 1200 og-another-testament.jpg
rm Jesus-blesses.jpg Moroni-Hill.jpg alma-friends1.png
cd -
```

Verify: `ls -la public/images/promo/` → 4 files, each ≤ ~400 KB; `file public/images/promo/*` shows JPEG, max dimension 1600 (OG: 1200×630).

- [ ] **Step 3: Commit**

```bash
git add public/images/promo && git commit -m "feat(promo): add Another Testament artwork assets (web-sized)"
```

### Task 1: Schema — nullable play_events.user_id + source; users.signup_ref

**Files:**
- Modify: `src/lib/db/schema.ts:181` (users, after `newsletterOptIn`) and `:330-347` (playEvents)

- [ ] **Step 1: Add `signupRef` to users**

In the `users` table, after the `newsletterOptIn` line:

```ts
    newsletterOptIn: boolean("newsletter_opt_in").default(false).notNull(),
    signupRef: varchar("signup_ref", { length: 64 }),
```

- [ ] **Step 2: Make playEvents.userId nullable and add source**

```ts
export const playEvents = pgTable(
  "play_events",
  {
    id: serial("id").primaryKey(),
    // Nullable: anonymous plays from promo pages are recorded without a user.
    userId: varchar("user_id", { length: 128 }).references(() => users.id),
    trackId: varchar("track_id", { length: 128 })
      .notNull()
      .references(() => tracks.id),
    source: varchar("source", { length: 32 }),
    playedAt: timestamp("played_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_play_events_track").on(table.trackId),
    index("idx_play_events_played_at").on(table.playedAt),
    index("idx_play_events_track_played_at").on(table.trackId, table.playedAt),
  ]
);
```

- [ ] **Step 3: Push schema (repo convention — no migrations)**

Run: `npm run db:push`
Expected: interactive-free apply; verify with `npx drizzle-kit push` output showing ALTER statements for `play_events.user_id` DROP NOT NULL, ADD COLUMN `source`, ADD COLUMN `signup_ref`. **Do not accept any DROP TABLE/column suggestions.**

- [ ] **Step 4: Fix the carry-on duration while we're in the DB**

```bash
npx tsx --env-file=.env.local -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
sql\`UPDATE tracks SET duration = 242 WHERE id = 'carry-on' AND duration = 0\`.then(r => {
  console.log('updated', r.count);
  return sql.end();
});
"
```
Expected: `updated 1`

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts && git commit -m "feat(schema): nullable play_events.user_id + source, users.signup_ref"
```

### Task 2: recordPlayEvent accepts anonymous + source

**Files:**
- Modify: `src/lib/db/queries.ts:883-885`

- [ ] **Step 1: Update the helper**

Replace:

```ts
export async function recordPlayEvent(userId: string, trackId: string) {
  await db.insert(playEvents).values({ userId, trackId });
}
```

with:

```ts
export async function recordPlayEvent(
  userId: string | null,
  trackId: string,
  source?: string
) {
  await db.insert(playEvents).values({ userId, trackId, source: source ?? null });
}
```

(Existing callers pass a non-null userId and no source — signature is backward compatible.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no NEW errors (compare against `git stash; npx tsc --noEmit; git stash pop` baseline if any pre-existing errors appear).

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/queries.ts && git commit -m "feat(analytics): recordPlayEvent supports anonymous plays with source"
```

### Task 3: Promo listen-gate module (TDD)

Pure logic for the soft gate so it's testable; the component consumes it.

**Files:**
- Create: `src/lib/promo/promo-gate.ts`
- Test: `src/lib/promo/promo-gate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { canPlayPromo, promoListenKey } from "./promo-gate";

describe("canPlayPromo", () => {
  it("allows authenticated users regardless of stored state", () => {
    expect(canPlayPromo(true, "used")).toBe(true);
    expect(canPlayPromo(true, null)).toBe(true);
  });

  it("allows anonymous users who have not used their free listen", () => {
    expect(canPlayPromo(false, null)).toBe(true);
    expect(canPlayPromo(false, "")).toBe(true);
  });

  it("blocks anonymous users after the free listen", () => {
    expect(canPlayPromo(false, "used")).toBe(false);
  });

  it("builds a per-track storage key", () => {
    expect(promoListenKey("carry-on")).toBe("hymnz-promo-listen:carry-on");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- promo-gate`
Expected: FAIL — cannot resolve `./promo-gate`

- [ ] **Step 3: Implement**

```ts
// Soft gate for promo-page free listens (see brainstorms/2026-07-16-video-promo-page.md).
// localStorage-based by design: a nudge toward registration, not DRM.

export function promoListenKey(trackId: string): string {
  return `hymnz-promo-listen:${trackId}`;
}

/** stored is the raw localStorage value for promoListenKey(trackId), or null. */
export function canPlayPromo(
  isAuthenticated: boolean,
  stored: string | null
): boolean {
  if (isAuthenticated) return true;
  return stored !== "used";
}

export function markPromoListenUsed(trackId: string): void {
  try {
    localStorage.setItem(promoListenKey(trackId), "used");
  } catch {
    // Private browsing / storage disabled — soft gate stays soft.
  }
}

export function getPromoListenState(trackId: string): string | null {
  try {
    return localStorage.getItem(promoListenKey(trackId));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- promo-gate`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo && git commit -m "feat(promo): listen-gate logic for one free anonymous listen"
```

### Task 4: `/api/promo/play` — record anonymous/authed promo listens

**Files:**
- Create: `src/app/api/promo/play/route.ts`
- Modify: `src/middleware.ts:27` (PUBLIC_PATHS)

- [ ] **Step 1: Create the route**

```ts
import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/auth/access";
import { incrementPlayCount, recordPlayEvent } from "@/lib/db/queries";

// Only tracks/sources featured on promo pages may be recorded here.
const PROMO_TRACKS = new Set(["carry-on"]);
const PROMO_SOURCES = new Set(["another-testament"]);

export async function POST(request: Request) {
  try {
    const { trackId, source } = await request.json();
    if (!PROMO_TRACKS.has(trackId) || !PROMO_SOURCES.has(source)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const access = await getAccessContext();
    await incrementPlayCount(trackId);
    await recordPlayEvent(access.userId, trackId, source);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording promo play:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add to PUBLIC_PATHS in middleware** (documentary — promo API must never be auth-gated)

In `src/middleware.ts` PUBLIC_PATHS array, after `"/api/stripe/webhook",`:

```ts
  "/api/promo",
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev` then
`curl -s -X POST localhost:3333/api/promo/play -H 'content-type: application/json' -d '{"trackId":"carry-on","source":"another-testament"}'`
Expected: `{"success":true}`; and `{"trackId":"x","source":"another-testament"}` → 400.
Check DB: `npx tsx --env-file=.env.local -e "import postgres from 'postgres'; const sql = postgres(process.env.DATABASE_URL); sql\`SELECT user_id, track_id, source FROM play_events ORDER BY id DESC LIMIT 1\`.then(r => { console.log(r); return sql.end(); });"`
Expected: row with `user_id: null, track_id: 'carry-on', source: 'another-testament'`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/promo src/middleware.ts && git commit -m "feat(promo): public play-recording endpoint for promo listens"
```

### Task 5: Attribution — ref cookie in middleware, stamped at signup

**Files:**
- Modify: `src/middleware.ts:42-54` (middleware function)
- Modify: `src/app/api/auth/register/route.ts` (imports + insert at 87-96)
- Modify: `src/lib/auth/oauth-upsert.ts:49` (insert)

- [ ] **Step 1: Set the cookie in middleware**

In `src/middleware.ts`, inside `middleware()`, immediately after `const { pathname } = request.nextUrl;`:

```ts
  // Promo attribution: stamp a ref cookie so signups from promo pages are
  // attributable (read by the register route / OAuth upsert).
  if (pathname === "/another-testament") {
    const utmSource = request.nextUrl.searchParams.get("utm_source");
    // Sanitize to a safe charset: raw query text can carry null bytes (breaks
    // the Postgres insert at signup) or split surrogates (breaks cookie
    // encoding) — and never let attribution block a signup.
    const cleaned = utmSource
      ?.toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 24);
    const ref = cleaned ? `another-testament:${cleaned}` : "another-testament";
    const response = NextResponse.next();
    response.cookies.set("hymnz_ref", ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }
```

- [ ] **Step 2: Stamp it in the register route**

In `src/app/api/auth/register/route.ts`: add import at top:

```ts
import { cookies } from "next/headers";
```

Right before the `db.insert(users).values({...})` block (line ~87):

```ts
    // Promo attribution: best-effort, never blocks signup.
    let signupRef: string | null = null;
    try {
      const cookieStore = await cookies();
      signupRef = cookieStore.get("hymnz_ref")?.value?.slice(0, 64) || null;
    } catch {
      signupRef = null;
    }
```

And inside the `.values({...})`, after `newsletterOptIn: false,`:

```ts
      signupRef,
```

- [ ] **Step 3: Stamp OAuth signups (best-effort)**

In `src/lib/auth/oauth-upsert.ts`: add import at top:

```ts
import { cookies } from "next/headers";
```

Immediately before the `await db.insert(users).values({` (line ~49):

```ts
  // Promo attribution: best-effort — cookies() may be unavailable in some
  // native-auth call paths; never block account creation on it.
  let signupRef: string | null = null;
  try {
    const cookieStore = await cookies();
    signupRef = cookieStore.get("hymnz_ref")?.value?.slice(0, 64) || null;
  } catch {
    signupRef = null;
  }
```

And add `signupRef,` inside that insert's `.values({...})` after `newsletterOptIn: false,`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — no new errors.
Manual: with dev server running, visit `localhost:3333/another-testament?utm_source=ig` in a browser (page 404s until Task 6 — cookie is still set on the 404 response since middleware runs first). Check DevTools → Application → Cookies: `hymnz_ref = another-testament:ig`. Then register a throwaway user via the UI and:
`npx tsx --env-file=.env.local -e "import postgres from 'postgres'; const sql = postgres(process.env.DATABASE_URL); sql\`SELECT email, signup_ref FROM users ORDER BY created_at DESC LIMIT 1\`.then(r => { console.log(r); return sql.end(); });"`
Expected: `signup_ref: 'another-testament:ig'`.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/app/api/auth/register/route.ts src/lib/auth/oauth-upsert.ts
git commit -m "feat(attribution): hymnz_ref cookie on promo page, stamped onto signups"
```

### Task 6: The page — server component + PromoPlayer client component

**Files:**
- Create: `src/app/another-testament/page.tsx`
- Create: `src/components/promo/PromoPlayer.tsx`

- [ ] **Step 1: Create PromoPlayer** (self-contained audio element — pattern from `useAdminAudioPlayer`; does NOT touch the global player store)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause } from "lucide-react";
import {
  canPlayPromo,
  getPromoListenState,
  markPromoListenUsed,
} from "@/lib/promo/promo-gate";

interface PromoPlayerProps {
  trackId: string;
  title: string;
  artist: string;
  audioUrl: string;
  artworkUrl: string;
  isAuthenticated: boolean;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PromoPlayer({
  trackId,
  title,
  artist,
  audioUrl,
  artworkUrl,
  isAuthenticated,
}: PromoPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reportedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // null until mounted (localStorage is client-only) to avoid hydration mismatch
  const [gated, setGated] = useState<boolean | null>(null);

  useEffect(() => {
    setGated(!canPlayPromo(isAuthenticated, getPromoListenState(trackId)));
  }, [isAuthenticated, trackId]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioUrl;
    audioRef.current = audio;

    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (!isAuthenticated) {
        markPromoListenUsed(trackId);
        setGated(true);
      }
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [audioUrl, isAuthenticated, trackId]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || gated) return;
    if (audio.paused) {
      audio.play();
      if (!reportedRef.current) {
        reportedRef.current = true;
        fetch("/api/promo/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId, source: "another-testament" }),
        }).catch(() => {});
      }
    } else {
      audio.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || gated) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  return (
    <div className="glass-heavy rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden">
          <Image src={artworkUrl} alt={title} fill className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-display text-lg font-semibold text-text-primary truncate">
            {title}
          </p>
          <p className="text-text-muted text-sm">{artist}</p>
        </div>
        <button
          onClick={togglePlay}
          disabled={gated === true}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="w-14 h-14 shrink-0 rounded-full bg-accent text-midnight flex items-center justify-center glow-accent disabled:opacity-40 disabled:shadow-none"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" fill="currentColor" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-text-dim text-xs tabular-nums">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 242}
          value={currentTime}
          onChange={seek}
          disabled={gated === true}
          className="flex-1 accent-[#00FFFB] h-1"
          aria-label="Seek"
        />
        <span className="text-text-dim text-xs tabular-nums">
          {formatTime(duration || 242)}
        </span>
      </div>

      {gated === true && (
        <div className="mt-4 rounded-xl bg-accent-dim border border-accent-26 p-4 text-center">
          <p className="text-text-primary text-sm font-medium">
            Hope you enjoyed your free listen.
          </p>
          <p className="text-text-secondary text-sm mt-1">
            Create a free account to listen again — and explore more sacred
            arrangements.
          </p>
          <Link
            href="/auth/register"
            className="inline-block mt-3 px-6 py-2.5 rounded-full bg-accent text-midnight text-sm font-semibold glow-accent"
          >
            Create free account
          </Link>
          <p className="text-text-dim text-xs mt-2">
            Already have one?{" "}
            <Link href="/auth/signin" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
```

Note on Tailwind classes: `accent-dim` / `accent-26` map to `--color-accent-dim` / `--color-accent-26` tokens in globals.css `@theme`. If `bg-accent-dim` / `border-accent-26` don't resolve at build, use arbitrary values `bg-[rgba(0,255,251,0.08)]` / `border-[rgba(0,255,251,0.26)]` — check globals.css lines 6–26 for exact token names first.

- [ ] **Step 2: Create the page**

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getTrackById } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";
import { auth } from "@/lib/auth/auth";
import { PromoPlayer } from "@/components/promo/PromoPlayer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hymnz.com";
const YOUTUBE_ID = "-dkI0pXWc_w";
const YOUTUBE_URL = `https://youtu.be/${YOUTUBE_ID}`;
const ARTVUE_URL = "https://www.artvue.io/collection/6a582bfca898ff72c478af63";
const BOM_APP_URL =
  "https://www.churchofjesuschrist.org/learn/mobile-applications/book-of-mormon-app";
const BOM_FREE_COPY_URL =
  "https://www.churchofjesuschrist.org/comeuntochrist/ps/book-of-mormon-lesson";

export const metadata: Metadata = {
  title: "Another Testament of Jesus Christ — A Book of Mormon Trailer | HYMNZ",
  description:
    "A visual and musical testimony of the book that changed my life. Watch the cinematic Book of Mormon trailer, hear the epic hymn arrangement of Carry On, and explore the original artwork.",
  openGraph: {
    title: "Another Testament of Jesus Christ — A Book of Mormon Trailer",
    description:
      "A visual and musical testimony of the book that changed my life.",
    url: `${APP_URL}/another-testament`,
    siteName: "HYMNZ",
    type: "video.other",
    images: [
      {
        url: `${APP_URL}/images/promo/og-another-testament.jpg`,
        width: 1200,
        height: 630,
        alt: "Another Testament of Jesus Christ — original artwork",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ART = [
  { src: "/images/promo/moroni-hill.jpg", alt: "A glorious messenger among the trees" },
  { src: "/images/promo/jesus-blesses.jpg", alt: "Jesus blesses a child" },
  { src: "/images/promo/alma-friends.jpg", alt: "The heavens open" },
];

export default async function AnotherTestamentPage() {
  const [track, session] = await Promise.all([
    getTrackById("carry-on"),
    auth(),
  ]);
  const audioUrl = track ? getMediaUrl(track.audioKey) : null;
  const artworkUrl = track ? getMediaUrl(track.artworkKey) : null;

  return (
    <div className="min-h-dvh bg-midnight">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/">
            <Image
              src="/images/hymnz-logo1.png"
              alt="HYMNZ"
              width={44}
              height={44}
              className="mb-4"
            />
          </Link>
          <h1 className="text-display text-3xl md:text-4xl font-bold text-text-primary">
            Another Testament of Jesus Christ
          </h1>
          <p className="text-text-secondary mt-2">A Book of Mormon Trailer</p>
          <p className="text-accent text-sm mt-3 italic">
            A visual and musical testimony of the book that changed my life.
          </p>
        </div>

        {/* Hero: video embed */}
        <section>
          <div className="aspect-video rounded-2xl overflow-hidden glass">
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_ID}?rel=0`}
              title="Another Testament of Jesus Christ — A Book of Mormon Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
              loading="lazy"
            />
          </div>
          <p className="text-center mt-3">
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-text-muted text-sm hover:text-accent transition-colors"
            >
              Watch in 4K on YouTube <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </p>
        </section>

        {/* Intro copy */}
        <section className="mt-8">
          <p className="text-text-secondary text-sm leading-relaxed text-center max-w-xl mx-auto">
            This cinematic trailer brings together three things close to my
            heart: the profound stories of the Book of Mormon, epic music, and
            original digital art. Every frame of artwork featured in this
            trailer is part of a larger collection celebrating scripture,
            light, and faith. The music was created for another passion project
            reimagining hymns in different genres&mdash;I arranged the hymn
            track first and built the entire trailer around it.
          </p>
        </section>

        <div className="gradient-divider my-10" />

        {/* The Music */}
        <section>
          <h2 className="text-display text-2xl font-bold text-text-primary text-center">
            The Music
          </h2>
          <p className="text-text-secondary text-sm text-center mt-2 mb-5 max-w-xl mx-auto">
            Featuring an epic hymn arrangement of &ldquo;Carry On&rdquo;
            exclusively on HYMNZ. Press play &mdash; the full arrangement, on
            the house.
          </p>
          {track && audioUrl && artworkUrl ? (
            <PromoPlayer
              trackId={track.id}
              title={track.title}
              artist={track.artist}
              audioUrl={audioUrl}
              artworkUrl={artworkUrl}
              isAuthenticated={!!session?.user}
            />
          ) : (
            <div className="glass rounded-2xl p-6 text-center text-text-muted text-sm">
              <Link href="/" className="text-accent hover:underline">
                Listen on HYMNZ
              </Link>
            </div>
          )}
          <p className="text-center text-text-secondary text-sm mt-4">
            Discover more uplifting, fun, motivating, and epic arrangements of
            sacred music on{" "}
            <Link href="/" className="text-accent hover:underline">
              HYMNZ
            </Link>
            .
          </p>
        </section>

        <div className="gradient-divider my-10" />

        {/* The Art */}
        <section>
          <h2 className="text-display text-2xl font-bold text-text-primary text-center">
            The Fine Art Collection
          </h2>
          <p className="text-text-secondary text-sm text-center mt-2 mb-5 max-w-xl mx-auto">
            Explore and collect the original artwork featured in this trailer
            on ArtVue.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ART.map((art) => (
              <a
                key={art.src}
                href={ARTVUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden group"
              >
                <Image
                  src={art.src}
                  alt={art.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </a>
            ))}
          </div>
          <p className="text-center mt-4">
            <a
              href={ARTVUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-accent text-sm font-medium hover:underline"
            >
              View the collection on ArtVue{" "}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </p>
        </section>

        <div className="gradient-divider my-10" />

        {/* Discover the Book of Mormon */}
        <section className="glass-heavy rounded-2xl p-6 md:p-8">
          <h2 className="text-display text-2xl font-bold text-text-primary text-center">
            Discover the Book of Mormon
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mt-4">
            The Book of Mormon has been a pivotal anchor in my life. When I
            first met with the missionaries and read it at the age of 20, my
            life did a complete 180. It has been the foundation of my faith in
            Jesus Christ for the 30 years since.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed mt-3">
            If you&apos;ve never read it, or want to explore it deeper, you can
            download the app or request a free physical copy delivered right to
            your door.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <a
              href={BOM_FREE_COPY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-5 py-3 rounded-full bg-accent text-midnight text-sm font-semibold glow-accent"
            >
              Request a free copy
            </a>
            <a
              href={BOM_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-5 py-3 rounded-full glass text-text-primary text-sm font-semibold hover:text-accent transition-colors"
            >
              Download the app
            </a>
          </div>
        </section>

        {/* Credits + footer */}
        <div className="text-center mt-10 space-y-4">
          <p className="text-text-dim text-xs">
            &ldquo;Carry On&rdquo; &mdash; Lyrics: Ruth May Fox, 1853&ndash;1958.
            Music: A. Sherman Tingey, 1864&ndash;1924. &copy; 1948 IRI.
          </p>
          <p className="text-text-secondary text-sm">
            <Link href="/" className="text-accent hover:underline">
              Discover more sacred arrangements on HYMNZ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the page renders**

Run: `npx tsc --noEmit` (no new errors), then with dev server: open `localhost:3333/another-testament`.
Expected: page renders inside the app shell; video iframe shows (YouTube error card while video is private — expected until it's unlisted); player card shows Carry On artwork; play works and audio streams the full 4:02; on `ended`, the gate card appears (anonymous); reload → play button disabled + gate card visible. `localStorage["hymnz-promo-listen:carry-on"] === "used"`. Sign in as testuser@hymnz.com / TestPass123 → player plays regardless of localStorage.

- [ ] **Step 4: Commit**

```bash
git add src/app/another-testament src/components/promo
git commit -m "feat(promo): Another Testament promo page with one-free-listen player"
```

### Task 7: Vercel Web Analytics

**Files:**
- Modify: `package.json` (dependency), `src/app/layout.tsx:54-59`

- [ ] **Step 1: Install**

```bash
npm install @vercel/analytics
```

- [ ] **Step 2: Add to root layout**

In `src/app/layout.tsx`, add import:

```ts
import { Analytics } from "@vercel/analytics/next";
```

and inside `<body>`, after `<AppShell>{children}</AppShell>`:

```tsx
        <Analytics />
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds. (Analytics only reports in production on Vercel; local check is that the build passes and the dev page still renders. After deploy, confirm the Vercel dashboard → Analytics shows the project enabled — the user may need to click "Enable" in the Vercel project settings once.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/layout.tsx
git commit -m "feat(analytics): add Vercel Web Analytics"
```

### Task 8: Feature "Carry On" on the home page (user-approved, until they say otherwise)

Data-only change: the home hero + free-user full-listen rule follow `featured_content` (`type: "track"`, lowest `position` wins; current rows: praise-to-the-man @1, sands-01 @2). Making Carry On position 0 puts it first AND gives registered free users full in-app listens (`isFeatured` → `isFull` for non-visitors), keeping the promo page's "register to listen again" promise inside the app.

- [ ] **Step 1: Insert the featured row**

```bash
npx tsx --env-file=.env.local -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
sql\`INSERT INTO featured_content (type, reference_id, position, active) VALUES ('track', 'carry-on', 0, true) RETURNING id\`.then(r => {
  console.log('inserted featured_content id', r[0].id);
  return sql.end();
});
"
```
Expected: `inserted featured_content id <n>`

- [ ] **Step 2: Verify on the home page**

With dev server running, open `localhost:3333/` as a signed-out visitor: hero/featured card shows Carry On. Sign in as testuser@hymnz.com (free tier): Carry On plays in full in the app.

- [ ] **Step 3: Note the revert** (no commit needed — data-only): to un-feature later, `UPDATE featured_content SET active = false WHERE reference_id = 'carry-on' AND type = 'track'`, or use the admin featured-content UI.

### Task 9: Full verification + PR

- [ ] **Step 1: Test suite + typecheck + build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all pass.

- [ ] **Step 2: Browser verification (use the verify/preview workflow)**

- Mobile viewport (375×812) and desktop: no horizontal scroll, sections stack cleanly, bottom nav doesn't cover the footer content.
- Anonymous flow: play full track → gate card on end → reload → still gated → "Create free account" links to `/auth/register`.
- Cookie: visiting `/another-testament?utm_source=ig` sets `hymnz_ref=another-testament:ig`.
- Register a throwaway → `users.signup_ref` populated; delete the throwaway after.
- `play_events` rows: anonymous (`user_id` null) and authed both record with `source='another-testament'`.
- Signed-in flow: unlimited replays.
- OG tags: `curl -s localhost:3333/another-testament | grep -o '<meta property="og:[^>]*>'` shows title/image/url.

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin feat/another-testament-promo
gh pr create --title "feat: Another Testament promo page (video release link-in-bio)" --body "..."
```

PR body should summarize: promo page, one-free-listen soft gate, attribution cookie → users.signup_ref, anonymous play events, Vercel Analytics. End with the standard generated-with footer.

---

## Post-review amendments (supersede Task 6 code above)

Code-quality review (commit 17b37c8) mandated: (1) `.catch(() => null)` on the page's `getTrackById`/`auth` calls so a DB blip degrades to the fallback card instead of a 500; (2) `usePlayerStore.getState().pause()` before promo playback so the global app player can't overlap; (3) `audio.play().catch` + `error`-event fallback UI, and the `/api/promo/play` POST moved into the `play` event so only confirmed playback is counted; (4) bigger slider touch target, `gated !== false` guards, `removeAttribute("src")` teardown, no `loading="lazy"` on the hero iframe. Applied in the follow-up fix commit.

## Launch-day checklist (not code — for the user, include in PR body)

0. **Verify `NEXT_PUBLIC_APP_URL` in Vercel production env is `https://hymnz.com`** — if it's a preview URL, the OG image link (and IG/DM link previews) break.

1. Flip YouTube video to **unlisted** once the page is deployed (user will do this) to test the embed; **public** Sunday 1 PM Mountain.
2. Bio links: `https://hymnz.com/another-testament?utm_source=instagram` (IG) and `?utm_source=tiktok` (TikTok).
3. Enable Web Analytics in the Vercel project dashboard if not already on.
4. Carry On is featured (Task 8) until the user says otherwise — revert via `UPDATE featured_content SET active = false WHERE reference_id = 'carry-on'` or admin UI.
5. Monday queries: registrations `SELECT signup_ref, count(*) FROM users GROUP BY 1`; listens `SELECT source, count(*), count(user_id) AS authed FROM play_events WHERE source IS NOT NULL GROUP BY 1`.

## Explicitly out of scope (YAGNI, per brainstorm)

- Hard server-side gating of the promo listen (soft gate decided).
- Signed CDN URLs (pre-existing documented fast-follow, unrelated).
- The single-track API route's full-URL leak (`src/app/api/tracks/[id]/route.ts:38`) — pre-existing, mention to user, don't fix here.
- In-app announcement (user handles separately).
- Custom Vercel events / PostHog.
