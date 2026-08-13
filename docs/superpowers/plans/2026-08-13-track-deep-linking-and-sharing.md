# Track Deep Linking and Branded Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one canonical HYMNZ track URL open the exact paused track on web, iOS, and Android, and produce a consistent branded preview when shared.

**Architecture:** Keep `/track/[id]` as the public fallback and add verified Apple Universal Links and Android App Links for the same HTTPS URL. Centralize share payloads, show a HYMNZ preview sheet before system sharing, generate a 1200×630 track image with `ImageResponse`, and handle both cold and warm Capacitor URL events through one strict parser.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, Zustand, Capacitor 8, Apple Universal Links, Android App Links.

**Spec:** `docs/superpowers/specs/2026-08-13-track-deep-linking-and-sharing-design.md`

## Global Constraints

- Canonical track URLs are exactly `https://www.hymnz.com/track/{encoded-track-id}`; never derive production share links from `window.location.origin` or a preview deployment.
- Opening a track link must not navigate away, request audio, update the player, increment playback, or consume a free listen until the recipient taps Play.
- Share cards contain artwork, title, artist, and HYMNZ branding only; no lyrics, color selection, song options, or alternate templates.
- System sharing sends title, text, and canonical URL; it does not attach the card as an image file.
- Native URL parsing accepts only HTTPS links on `www.hymnz.com` with exactly one segment after `/track/`.
- Apple application identifier is `GGQ33S5R67.com.hymnz.app`; Android package is `com.hymnz.app`.
- Verified native scope is `/track/*`; collection sharing continues to work as web sharing but does not gain native deep linking in this change.
- Android signing fingerprints come from `ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS`; do not invent or silently publish an empty value.
- Missing/inactive tracks return not found; missing artwork uses a branded fallback.
- Preserve unrelated worktree changes and do not reformat adjacent code.

## File map

### Share contract and UI

- Create `src/lib/share/shareData.ts` — canonical URL, text, image URL, and payload builders.
- Create `src/lib/share/shareData.test.ts` — literal contract tests for track and collection shares.
- Create `src/lib/share/systemShare.ts` — native/web system-share selection and result normalization.
- Create `src/lib/share/systemShare.test.ts` — external-platform boundary tests.
- Create `src/components/share/TrackShareCard.tsx` — reusable in-app card.
- Create `src/components/share/ShareSheet.test.tsx` — preview-first behavior and fallback tests.
- Modify `src/lib/store/shareStore.ts` — consume the shared `ShareData` type.
- Modify `src/lib/hooks/useShare.ts` — always open the HYMNZ sheet.
- Modify `src/components/share/ShareSheet.tsx` — render the card and invoke system sharing only on explicit tap.
- Modify `package.json` and `package-lock.json` — add Capacitor and component-test dependencies.

### Track destination and metadata

- Create `src/app/(app)/track/[id]/TrackLanding.test.tsx` — prove no timed navigation and one-tap routing.
- Create `src/app/(app)/track/[id]/page.test.tsx` — inactive-track and metadata contract tests.
- Modify `src/app/(app)/track/[id]/TrackLanding.tsx` — remove automatic redirect.
- Modify `src/app/(app)/track/[id]/page.tsx` — require active tracks and advertise the branded image.
- Create `src/app/(app)/track/[id]/opengraph-image.tsx` — generate the 1200×630 PNG.
- Create `src/app/(app)/track/[id]/opengraph-image.test.tsx` — image dimensions, MIME type, and fallback tests.

### Association documents and native routing

- Create `src/lib/deep-links/associations.ts` — AASA/Asset Links builders and fingerprint validation.
- Create `src/lib/deep-links/associations.test.ts` — exact identifier, path, and fingerprint tests.
- Create `src/app/.well-known/apple-app-site-association/route.ts` — Apple association response.
- Create `src/app/.well-known/assetlinks.json/route.ts` — Android association response with fail-closed configuration.
- Create `src/app/.well-known/association-routes.test.ts` — response status/header tests.
- Modify `.env.example` — document the Android fingerprint variable.
- Create `src/lib/deep-links/nativeTrackLinks.ts` — canonical parser and cold/warm registration helper.
- Create `src/lib/deep-links/nativeTrackLinks.test.ts` — strict parsing and lifecycle tests.
- Create `src/components/layout/NativeDeepLinkHandler.tsx` — native-only React bridge.
- Create `src/components/layout/NativeDeepLinkHandler.test.tsx` — web no-op and native registration tests.
- Modify `src/app/layout.tsx` — mount the bridge once.
- Modify `ios/App/App/App.entitlements` — add `applinks:www.hymnz.com`.
- Modify `android/app/src/main/AndroidManifest.xml` — add the verified `/track/` VIEW filter.
- Regenerate Capacitor plugin files with `npm run cap:sync`.

### Release verification

- Create `docs/release/track-deep-links.md` — production, Android, iOS, and share-preview release checks.

---

### Task 1: Canonical share-data contract

**Files:**
- Create: `src/lib/share/shareData.ts`
- Create: `src/lib/share/shareData.test.ts`
- Modify: `src/lib/store/shareStore.ts`
- Modify: `src/lib/hooks/useShare.ts`

**Interfaces:**
- Produces: `ShareData`, `SharePayload`, `buildShareUrl(data)`, `buildShareText(data)`, `buildSharePayload(data)`, and `buildTrackShareImageUrl(id)`.
- Consumers: Tasks 2 and 4 use these exact exports.

- [ ] **Step 1: Write the failing canonical-contract tests**

Create `src/lib/share/shareData.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildSharePayload,
  buildShareText,
  buildShareUrl,
  buildTrackShareImageUrl,
  type ShareData,
} from "./shareData";

const track: ShareData = {
  type: "track",
  id: "carry on",
  title: "Carry On",
  artist: "HYMNZ",
  artworkUrl: "https://cdn.example/carry-on.jpg",
};

describe("shareData", () => {
  it("builds a canonical encoded track URL", () => {
    expect(buildShareUrl(track)).toBe(
      "https://www.hymnz.com/track/carry%20on"
    );
  });

  it("builds the canonical branded image URL", () => {
    expect(buildTrackShareImageUrl("carry on")).toBe(
      "https://www.hymnz.com/track/carry%20on/opengraph-image"
    );
  });

  it("builds literal track share text and payload", () => {
    expect(buildShareText(track)).toBe(
      "Listen to “Carry On” by HYMNZ on HYMNZ"
    );
    expect(buildSharePayload(track)).toEqual({
      title: "Carry On",
      text: "Listen to “Carry On” by HYMNZ on HYMNZ",
      url: "https://www.hymnz.com/track/carry%20on",
    });
  });

  it("uses HYMNZ when a track artist is absent", () => {
    expect(buildShareText({ ...track, artist: undefined })).toBe(
      "Listen to “Carry On” by HYMNZ on HYMNZ"
    );
  });

  it("preserves the collection sharing contract", () => {
    const collection: ShareData = {
      type: "collection",
      id: "sands-of-the-sea",
      title: "Sands of the Sea",
    };
    expect(buildSharePayload(collection)).toEqual({
      title: "Sands of the Sea",
      text: "Check out “Sands of the Sea” on HYMNZ",
      url: "https://www.hymnz.com/collection/sands-of-the-sea",
    });
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```bash
npx vitest run src/lib/share/shareData.test.ts
```

Expected: FAIL because `src/lib/share/shareData.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure share module**

Create `src/lib/share/shareData.ts`:

```ts
export const CANONICAL_APP_ORIGIN = "https://www.hymnz.com";

export interface ShareData {
  type: "track" | "collection";
  id: string;
  title: string;
  artist?: string;
  artworkUrl?: string | null;
}

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

function encodedId(id: string): string {
  return encodeURIComponent(id);
}

export function buildShareUrl(data: ShareData): string {
  const segment = data.type === "track" ? "track" : "collection";
  return `${CANONICAL_APP_ORIGIN}/${segment}/${encodedId(data.id)}`;
}

export function buildTrackShareImageUrl(id: string): string {
  return `${CANONICAL_APP_ORIGIN}/track/${encodedId(id)}/opengraph-image`;
}

export function buildShareText(data: ShareData): string {
  if (data.type === "track") {
    return `Listen to “${data.title}” by ${data.artist || "HYMNZ"} on HYMNZ`;
  }
  return `Check out “${data.title}” on HYMNZ`;
}

export function buildSharePayload(data: ShareData): SharePayload {
  return {
    title: data.title,
    text: buildShareText(data),
    url: buildShareUrl(data),
  };
}
```

Modify `src/lib/store/shareStore.ts` to import `ShareData` from this module and re-export the type for compatibility:

```ts
import type { ShareData } from "@/lib/share/shareData";
export type { ShareData } from "@/lib/share/shareData";
```

Replace `useShare.ts` with a hook whose `share` callback only calls `openShare(data)` and which returns the imported pure builders. Do not call `navigator.share` in this hook.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
npx vitest run src/lib/share/shareData.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Run existing share call-site type checking**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS; current `share({...})` callers remain compatible.

- [ ] **Step 6: Commit the share contract**

```bash
git add src/lib/share/shareData.ts src/lib/share/shareData.test.ts src/lib/store/shareStore.ts src/lib/hooks/useShare.ts
git commit -m "feat: centralize canonical share links"
```

---

### Task 2: Preview-first HYMNZ share sheet and reliable system sharing

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/share/systemShare.ts`
- Create: `src/lib/share/systemShare.test.ts`
- Create: `src/components/share/TrackShareCard.tsx`
- Create: `src/components/share/ShareSheet.test.tsx`
- Modify: `src/components/share/ShareSheet.tsx`

**Interfaces:**
- Consumes: `ShareData`, `SharePayload`, and `buildSharePayload` from Task 1.
- Produces: `canUseSystemShare()` and `shareWithSystem(payload): Promise<SystemShareResult>` where `SystemShareResult` is `"shared" | "unavailable" | "cancelled" | "failed"`.
- Consumers: ShareSheet only; no other code calls the Capacitor Share plugin directly.

- [ ] **Step 1: Install runtime and component-test dependencies**

Run:

```bash
npm install @capacitor/app@^8 @capacitor/share@^8
npm install --save-dev @testing-library/react @testing-library/user-event jsdom
```

Expected: `package.json` and `package-lock.json` list both Capacitor plugins and all three test dependencies. Do not run `cap sync` until Task 6.

- [ ] **Step 2: Write failing platform-share tests**

Create `src/lib/share/systemShare.test.ts` with module mocks only at the operating-system boundary:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { canUseSystemShare, shareWithSystem } from "./systemShare";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn() },
}));
vi.mock("@capacitor/share", () => ({
  Share: { share: vi.fn() },
}));

const payload = {
  title: "Carry On",
  text: "Listen to “Carry On” by HYMNZ on HYMNZ",
  url: "https://www.hymnz.com/track/carry-on",
};

describe("system sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
  });

  it("uses Capacitor Share inside a native app", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Share.share).mockResolvedValue({ activityType: "messages" });
    expect(await shareWithSystem(payload)).toBe("shared");
    expect(Share.share).toHaveBeenCalledWith({
      ...payload,
      dialogTitle: "Share Carry On",
    });
  });

  it("uses Web Share in a capable browser", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { share },
    });
    expect(canUseSystemShare()).toBe(true);
    expect(await shareWithSystem(payload)).toBe("shared");
    expect(share).toHaveBeenCalledWith(payload);
  });

  it("reports unavailable sharing without throwing", async () => {
    expect(canUseSystemShare()).toBe(false);
    expect(await shareWithSystem(payload)).toBe("unavailable");
  });

  it("normalizes a Web Share cancellation", async () => {
    const share = vi.fn().mockRejectedValue(
      new DOMException("Canceled", "AbortError")
    );
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { share },
    });
    expect(await shareWithSystem(payload)).toBe("cancelled");
  });
});
```

- [ ] **Step 3: Run the system-share tests and verify RED**

Run:

```bash
npx vitest run src/lib/share/systemShare.test.ts
```

Expected: FAIL because `systemShare.ts` does not exist.

- [ ] **Step 4: Implement system-share selection**

Create `src/lib/share/systemShare.ts`:

```ts
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import type { SharePayload } from "./shareData";

export type SystemShareResult =
  | "shared"
  | "unavailable"
  | "cancelled"
  | "failed";

export function canUseSystemShare(): boolean {
  return (
    Capacitor.isNativePlatform() ||
    (typeof navigator !== "undefined" && typeof navigator.share === "function")
  );
}

function isCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function shareWithSystem(
  payload: SharePayload
): Promise<SystemShareResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        ...payload,
        dialogTitle: `Share ${payload.title}`,
      });
      return "shared";
    }

    if (typeof navigator === "undefined" || !navigator.share) {
      return "unavailable";
    }

    await navigator.share(payload);
    return "shared";
  } catch (error) {
    return isCancellation(error) ? "cancelled" : "failed";
  }
}
```

- [ ] **Step 5: Run the system-share tests and verify GREEN**

Run:

```bash
npx vitest run src/lib/share/systemShare.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 6: Write failing preview-first sheet tests**

Create `src/components/share/ShareSheet.test.tsx` with `// @vitest-environment jsdom` as its first line. Mock `shareWithSystem`, open the real Zustand store with a track, and assert these observable behaviors:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareSheet } from "./ShareSheet";
import { useShareStore } from "@/lib/store/shareStore";
import { shareWithSystem } from "@/lib/share/systemShare";

vi.mock("@/lib/share/systemShare", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/share/systemShare")>();
  return {
    ...actual,
    canUseSystemShare: () => true,
    shareWithSystem: vi.fn(),
  };
});

describe("ShareSheet", () => {
  beforeEach(() => {
    useShareStore.getState().openShare({
      type: "track",
      id: "carry-on",
      title: "Carry On",
      artist: "HYMNZ",
      artworkUrl: "/images/song-art/carry-on.jpg",
    });
  });

  afterEach(() => {
    cleanup();
    useShareStore.getState().closeShare();
    vi.clearAllMocks();
  });

  it("shows the branded preview before invoking system sharing", () => {
    render(<ShareSheet />);
    expect(screen.getByLabelText("Share preview for Carry On")).not.toBeNull();
    expect(screen.getByText("Carry On")).not.toBeNull();
    expect(shareWithSystem).not.toHaveBeenCalled();
  });

  it("shares only after the explicit Share tap", async () => {
    vi.mocked(shareWithSystem).mockResolvedValue("shared");
    render(<ShareSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Share…" }));
    await waitFor(() =>
      expect(shareWithSystem).toHaveBeenCalledWith({
        title: "Carry On",
        text: "Listen to “Carry On” by HYMNZ on HYMNZ",
        url: "https://www.hymnz.com/track/carry-on",
      })
    );
  });

  it("keeps link fallbacks after a failed system share", async () => {
    vi.mocked(shareWithSystem).mockResolvedValue("failed");
    render(<ShareSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Share…" }));
    expect(await screen.findByRole("link", { name: "WhatsApp" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Copy link" })).not.toBeNull();
  });
});
```

If Framer Motion prevents jsdom from rendering, mock only its animation wrappers to return their real children; do not mock `ShareSheet`, `TrackShareCard`, the store, or share payload builders.

- [ ] **Step 7: Run the sheet tests and verify RED**

Run:

```bash
npx vitest run src/components/share/ShareSheet.test.tsx
```

Expected: FAIL because the current sheet has no branded card or explicit Share button.

- [ ] **Step 8: Add the card and update the sheet**

Create `TrackShareCard.tsx` with this public contract and content hierarchy:

```tsx
import type { ShareData } from "@/lib/share/shareData";

export function TrackShareCard({ data }: { data: ShareData }) {
  const artist = data.type === "track" ? data.artist || "HYMNZ" : "HYMNZ";

  return (
    <div
      aria-label={`Share preview for ${data.title}`}
      className="relative flex aspect-[1200/630] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#26364a] to-[#0e151f] p-4 shadow-2xl"
    >
      <div className="aspect-square h-full shrink-0 overflow-hidden rounded-xl bg-white/5">
        {data.artworkUrl ? (
          <img
            src={data.artworkUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-accent/25 to-gold/20" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between pl-4 py-1">
        <div className="min-w-0">
          <p className="line-clamp-2 text-base font-bold text-white">{data.title}</p>
          <p className="mt-1 truncate text-xs text-white/65">{artist}</p>
        </div>
        <div className="flex items-center gap-2">
          <img src="/images/hymnz-logo2.png" alt="HYMNZ" className="h-7 w-auto" />
          <span className="text-[10px] font-medium text-white/60">Listen on HYMNZ</span>
        </div>
      </div>
    </div>
  );
}
```

Refactor `ShareSheet.tsx` to:

1. derive `const payload = buildSharePayload(shareData)`;
2. render `<TrackShareCard data={shareData} />` before actions;
3. initialize fallback visibility with `!canUseSystemShare()`;
4. call `shareWithSystem(payload)` only from the **Share…** button;
5. close after `"shared"`, remain open after `"cancelled"`, and reveal direct links after `"failed"` or `"unavailable"`;
6. keep Copy link available at all times and label it exactly `Copy link`; and
7. build X, Facebook, WhatsApp, and Message destinations from `payload.text` and `payload.url`.

Use a local `sharing` boolean to prevent double taps while the system sheet is opening. Reset `copied`, `sharing`, and fallback visibility whenever `shareData?.id` changes.

- [ ] **Step 9: Run share tests and full type checking**

Run:

```bash
npx vitest run src/lib/share/shareData.test.ts src/lib/share/systemShare.test.ts src/components/share/ShareSheet.test.tsx
npx tsc --noEmit
```

Expected: all focused tests and TypeScript PASS.

- [ ] **Step 10: Commit the preview-first share flow**

```bash
git add package.json package-lock.json src/lib/share/systemShare.ts src/lib/share/systemShare.test.ts src/components/share/TrackShareCard.tsx src/components/share/ShareSheet.tsx src/components/share/ShareSheet.test.tsx
git commit -m "feat: add branded preview-first sharing"
```

---

### Task 3: Deliberate track landing with no autoplay

**Files:**
- Create: `src/app/(app)/track/[id]/TrackLanding.test.tsx`
- Create: `src/app/(app)/track/[id]/page.test.tsx`
- Modify: `src/app/(app)/track/[id]/TrackLanding.tsx`
- Modify: `src/app/(app)/track/[id]/page.tsx`

**Interfaces:**
- Consumes: `buildShareUrl` and `buildTrackShareImageUrl` from Task 1.
- Produces: a public active-track page whose only playback entry is the Play button.

- [ ] **Step 1: Write the failing no-autoplay component test**

Create `TrackLanding.test.tsx` with jsdom. Use a real render and mock only Next navigation:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrackLanding } from "./TrackLanding";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

describe("TrackLanding", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("does not navigate or start playback on load", () => {
    render(
      <TrackLanding
        trackId="carry-on"
        title="Carry On"
        artist="HYMNZ"
        artworkUrl={null}
        collectionId="all-tracks"
        collectionTitle="All Tracks"
      />
    );
    vi.advanceTimersByTime(500);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("starts the exact track only after Play is tapped", () => {
    render(
      <TrackLanding
        trackId="carry-on"
        title="Carry On"
        artist="HYMNZ"
        artworkUrl={null}
        collectionId="all-tracks"
        collectionTitle="All Tracks"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Play on HYMNZ" }));
    expect(push).toHaveBeenCalledWith(
      "/collection/all-tracks?play=carry-on"
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("returns to the catalog when the track has no usable collection", () => {
    render(
      <TrackLanding
        trackId="orphan-track"
        title="Orphan Track"
        artist="HYMNZ"
        artworkUrl={null}
        collectionId={null}
        collectionTitle={null}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Play on HYMNZ" }));
    expect(push).toHaveBeenCalledWith("/");
  });
});
```

- [ ] **Step 2: Run the landing tests and verify the timed redirect fails them**

Run:

```bash
npx vitest run 'src/app/(app)/track/[id]/TrackLanding.test.tsx'
```

Expected: first test FAIL because `router.replace` runs after 100 ms; second test may fail until the accessible button label is updated.

- [ ] **Step 3: Remove automatic navigation and keep one explicit action**

In `TrackLanding.tsx`:

- remove the `useEffect` import and timed redirect block;
- retain `handleListen`, which pushes `/collection/${collectionId}?play=${trackId}` or `/` when no collection exists;
- set the button's accessible/visible label to `Play on HYMNZ`; and
- do not import or call the player store.

The route target remains literal:

```ts
const handleListen = () => {
  if (collectionId) {
    router.push(`/collection/${collectionId}?play=${trackId}`);
    return;
  }
  router.push("/");
};
```

- [ ] **Step 4: Run the landing tests and verify GREEN**

Run:

```bash
npx vitest run 'src/app/(app)/track/[id]/TrackLanding.test.tsx'
```

Expected: 3 tests PASS.

- [ ] **Step 5: Write failing inactive-track and canonical-metadata tests**

Create `page.test.tsx`. Mock DB/media calls with these complete track and collection records, and mock `notFound` to throw `Error("NOT_FOUND")`:

```ts
const now = new Date("2026-08-13T12:00:00.000Z");
const activeTrack = {
  id: "carry-on",
  collectionId: "all-tracks",
  title: "Carry On",
  artist: "HYMNZ",
  artworkKey: "images/artwork/carry-on.jpg",
  audioKey: "audio/tracks/carry-on.mp3",
  audioFormat: "mp3",
  originalAudioKey: null,
  duration: 210,
  trackNumber: 1,
  playCount: 10,
  favoriteCount: 4,
  isActive: true,
  hasVideo: false,
  videoKey: null,
  videoThumbnailKey: null,
  videoCount: 0,
  hasLyrics: false,
  youtubeUrl: null,
  publishedAt: now,
  createdAt: now,
  updatedAt: now,
};
const collection = {
  id: "all-tracks",
  title: "All Tracks",
  subtitle: null,
  description: null,
  artworkKey: "images/artwork/all-tracks.jpg",
  featured: false,
  isSacred7: false,
  sortOrder: 0,
  publishedAt: now,
  createdAt: now,
  updatedAt: now,
};
```

Cover these exact outcomes:

```ts
expect(
  generateMetadata({ params: Promise.resolve({ id: "carry-on" }) })
).resolves.toMatchObject({
  openGraph: {
    url: "https://www.hymnz.com/track/carry-on",
    images: [
      {
        url: "https://www.hymnz.com/track/carry-on/opengraph-image",
        width: 1200,
        height: 630,
      },
    ],
  },
});
```

Then return `{ ...activeTrack, isActive: false }` from `getTrackById` and assert:

```ts
await expect(
  TrackPage({ params: Promise.resolve({ id: "hidden-track" }) })
).rejects.toThrow("NOT_FOUND");

await expect(
  generateMetadata({ params: Promise.resolve({ id: "hidden-track" }) })
).resolves.toEqual({ title: "Track Not Found | HYMNZ" });
```

- [ ] **Step 6: Run the page tests and verify RED**

Run:

```bash
npx vitest run 'src/app/(app)/track/[id]/page.test.tsx'
```

Expected: FAIL because inactive tracks are currently returned and metadata uses raw artwork/environment origin.

- [ ] **Step 7: Enforce active tracks and canonical metadata**

In both `generateMetadata` and the default page function, treat `!track || !track.isActive` as not found. Import the Task 1 builders and construct metadata with:

```ts
const shareData = {
  type: "track" as const,
  id: track.id,
  title: track.title,
  artist,
};
const canonicalUrl = buildShareUrl(shareData);
const shareImageUrl = buildTrackShareImageUrl(track.id);
```

Set both Open Graph and Twitter images to the generated image with 1200×630 dimensions and descriptive alt text. Preserve Open Graph `type: "music.song"`, `siteName: "HYMNZ"`, track title, artist description, and the Twitter `summary_large_image` card. Remove the raw-artwork metadata image entries; continue passing resolved artwork to `TrackLanding`.

- [ ] **Step 8: Run both track test files**

Run:

```bash
npx vitest run 'src/app/(app)/track/[id]/TrackLanding.test.tsx' 'src/app/(app)/track/[id]/page.test.tsx'
```

Expected: all track landing and metadata tests PASS.

- [ ] **Step 9: Commit deliberate track entry**

```bash
git add 'src/app/(app)/track/[id]/TrackLanding.tsx' 'src/app/(app)/track/[id]/TrackLanding.test.tsx' 'src/app/(app)/track/[id]/page.tsx' 'src/app/(app)/track/[id]/page.test.tsx'
git commit -m "fix: require a tap before shared track playback"
```

---

### Task 4: Dynamic branded Open Graph image

**Files:**
- Create: `src/app/(app)/track/[id]/opengraph-image.tsx`
- Create: `src/app/(app)/track/[id]/opengraph-image.test.tsx`

**Interfaces:**
- Consumes: `getTrackById`, `getCollectionById`, `getMediaUrl`, and the existing logo `public/images/hymnz-logo2.png`.
- Produces: `GET /track/{id}/opengraph-image`, a 1200×630 `image/png` response.

- [ ] **Step 1: Write the failing image-response test**

Create `opengraph-image.test.tsx`. Mock the DB query boundary with complete active-track and collection objects matching the fixtures in Task 3, make `getMediaUrl` return `null` for the fallback case, then assert:

```ts
import { describe, expect, it, vi } from "vitest";
import TrackOpenGraphImage, {
  contentType,
  size,
} from "./opengraph-image";

vi.mock("@/lib/db/queries", () => ({
  getTrackById: vi.fn().mockResolvedValue({
    id: "carry-on",
    collectionId: "all-tracks",
    title: "Carry On",
    artist: "HYMNZ",
    artworkKey: null,
    audioKey: "audio/tracks/carry-on.mp3",
    audioFormat: "mp3",
    originalAudioKey: null,
    duration: 210,
    trackNumber: 1,
    playCount: 10,
    favoriteCount: 4,
    isActive: true,
    hasVideo: false,
    videoKey: null,
    videoThumbnailKey: null,
    videoCount: 0,
    hasLyrics: false,
    youtubeUrl: null,
    publishedAt: new Date("2026-08-13T12:00:00.000Z"),
    createdAt: new Date("2026-08-13T12:00:00.000Z"),
    updatedAt: new Date("2026-08-13T12:00:00.000Z"),
  }),
  getCollectionById: vi.fn().mockResolvedValue({
    id: "all-tracks",
    title: "All Tracks",
    subtitle: null,
    description: null,
    artworkKey: null,
    featured: false,
    isSacred7: false,
    sortOrder: 0,
    publishedAt: new Date("2026-08-13T12:00:00.000Z"),
    createdAt: new Date("2026-08-13T12:00:00.000Z"),
    updatedAt: new Date("2026-08-13T12:00:00.000Z"),
  }),
}));
vi.mock("@/lib/s3/client", () => ({ getMediaUrl: vi.fn(() => null) }));

describe("track Open Graph image", () => {
  it("returns a non-empty 1200x630 PNG without artwork", async () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
    const response = await TrackOpenGraphImage({
      params: Promise.resolve({ id: "carry-on" }),
    });
    expect(response.headers.get("content-type")).toContain("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run the image test and verify RED**

Run:

```bash
npx vitest run 'src/app/(app)/track/[id]/opengraph-image.test.tsx'
```

Expected: FAIL because the image module does not exist.

- [ ] **Step 3: Implement a resilient ImageResponse**

Create `opengraph-image.tsx` with these exports:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getCollectionById, getTrackById } from "@/lib/db/queries";
import { getMediaUrl } from "@/lib/s3/client";

export const runtime = "nodejs";
export const alt = "Listen to this track on HYMNZ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function toDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return null;
    const mime = response.headers.get("content-type") || "image/jpeg";
    const data = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${mime};base64,${data}`;
  } catch {
    return null;
  }
}
```

In the default export:

1. load the track and call `notFound()` for missing/inactive data;
2. load its collection when present;
3. resolve track artwork, then collection artwork;
4. call `toDataUrl` so remote failures become `null`;
5. read `public/images/hymnz-logo2.png` and convert it to a PNG data URL; and
6. return `new ImageResponse(..., size)` using flexbox-only Satori-compatible styles.

The rendered tree must use a 315×315 artwork square at left (or a cyan/gold branded fallback), title and artist at right, and the real HYMNZ logo plus `Listen on HYMNZ` along the bottom. Keep text within the card with `overflow: "hidden"`; title font size is 58 px with at most two lines and artist is 30 px.

Use this local-logo conversion exactly:

```ts
const logo = await readFile(
  join(process.cwd(), "public/images/hymnz-logo2.png")
);
const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
```

- [ ] **Step 4: Run image and metadata tests**

Run:

```bash
npx vitest run 'src/app/(app)/track/[id]/opengraph-image.test.tsx' 'src/app/(app)/track/[id]/page.test.tsx'
```

Expected: PNG and metadata tests PASS.

- [ ] **Step 5: Render one image locally and inspect it**

Start the app:

```bash
npm run dev
```

In another terminal, request:

```bash
curl --fail --output /tmp/hymnz-track-share.png http://localhost:3333/track/sands-01/opengraph-image
```

Open `/tmp/hymnz-track-share.png` with the workspace image viewer. Verify artwork/fallback, title, artist, and logo are legible at full size and at a roughly 375 px-wide preview. Stop the dev server after inspection.

- [ ] **Step 6: Commit the generated share card**

```bash
git add 'src/app/(app)/track/[id]/opengraph-image.tsx' 'src/app/(app)/track/[id]/opengraph-image.test.tsx'
git commit -m "feat: generate branded track share images"
```

---

### Task 5: Apple and Android website association endpoints

**Files:**
- Create: `src/lib/deep-links/associations.ts`
- Create: `src/lib/deep-links/associations.test.ts`
- Create: `src/app/.well-known/apple-app-site-association/route.ts`
- Create: `src/app/.well-known/assetlinks.json/route.ts`
- Create: `src/app/.well-known/association-routes.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `buildAppleAppSiteAssociation()`, `parseAndroidFingerprints(raw)`, and `buildAndroidAssetLinks(raw)`.
- Consumes: `ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS`, a comma-separated server-only environment value.

- [ ] **Step 1: Write failing association-builder tests**

Create `associations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildAndroidAssetLinks,
  buildAppleAppSiteAssociation,
  parseAndroidFingerprints,
} from "./associations";

const fingerprintA = Array.from({ length: 32 }, () => "AA").join(":");
const fingerprintB = Array.from({ length: 32 }, () => "BB").join(":");

describe("deep-link associations", () => {
  it("scopes Apple Universal Links to production tracks", () => {
    expect(buildAppleAppSiteAssociation()).toEqual({
      applinks: {
        apps: [],
        details: [
          {
            appIDs: ["GGQ33S5R67.com.hymnz.app"],
            components: [
              {
                "/": "/track/*",
                comment: "Open public HYMNZ track links",
              },
            ],
          },
        ],
      },
    });
  });

  it("normalizes, de-duplicates, and accepts multiple Android fingerprints", () => {
    expect(parseAndroidFingerprints(`${fingerprintA}, ${fingerprintB}, ${fingerprintA}`)).toEqual([
      fingerprintA,
      fingerprintB,
    ]);
  });

  it("rejects empty and malformed Android fingerprints", () => {
    expect(() => parseAndroidFingerprints(undefined)).toThrow(
      "ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS is required"
    );
    expect(() => parseAndroidFingerprints("not-a-fingerprint")).toThrow(
      "Invalid Android SHA-256 certificate fingerprint"
    );
  });

  it("builds the production Android association", () => {
    expect(buildAndroidAssetLinks(fingerprintA)).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.hymnz.app",
          sha256_cert_fingerprints: [fingerprintA],
        },
      },
    ]);
  });
});
```

- [ ] **Step 2: Run builder tests and verify RED**

Run:

```bash
npx vitest run src/lib/deep-links/associations.test.ts
```

Expected: FAIL because the builder module does not exist.

- [ ] **Step 3: Implement exact association builders**

Create `associations.ts`. Normalize each candidate by removing colons, uppercasing it, validating exactly 64 hexadecimal characters, and rejoining every two characters with `:`. Reject the complete input when any candidate is invalid.

```ts
const APPLE_APP_ID = "GGQ33S5R67.com.hymnz.app";
const ANDROID_PACKAGE = "com.hymnz.app";

export function parseAndroidFingerprints(
  raw: string | undefined
): string[] {
  if (!raw?.trim()) {
    throw new Error("ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS is required");
  }

  const normalized = raw.split(",").map((candidate) => {
    const hex = candidate.replaceAll(":", "").trim().toUpperCase();
    if (!/^[A-F0-9]{64}$/.test(hex)) {
      throw new Error("Invalid Android SHA-256 certificate fingerprint");
    }
    return hex.match(/.{2}/g)!.join(":");
  });

  return [...new Set(normalized)];
}
```

Implement the Apple and Android result objects exactly as asserted in Step 1.

- [ ] **Step 4: Run builder tests and verify GREEN**

Run:

```bash
npx vitest run src/lib/deep-links/associations.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Write failing route-response tests**

Create `src/app/.well-known/association-routes.test.ts`. Import each `GET` with aliases, use `vi.stubEnv` for Android, and assert:

```ts
import { afterEach, expect, it, vi } from "vitest";
import { GET as getAppleAssociation } from "./apple-app-site-association/route";
import { GET as getAndroidAssociation } from "./assetlinks.json/route";

const fingerprintA = Array.from({ length: 32 }, () => "AA").join(":");

afterEach(() => vi.unstubAllEnvs());

it("serves both association documents directly as JSON", async () => {
const apple = await getAppleAssociation();
expect(apple.status).toBe(200);
expect(apple.headers.get("content-type")).toContain("application/json");
expect(apple.headers.get("location")).toBeNull();

vi.stubEnv("ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS", fingerprintA);
const android = await getAndroidAssociation();
expect(android.status).toBe(200);
expect(android.headers.get("content-type")).toContain("application/json");
});

it("fails closed when Android signing data is absent", async () => {
vi.stubEnv("ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS", "");
const misconfigured = await getAndroidAssociation();
expect(misconfigured.status).toBe(503);
expect(misconfigured.headers.get("cache-control")).toBe("no-store");
});
```

- [ ] **Step 6: Run route tests and verify RED**

Run:

```bash
npx vitest run src/app/.well-known/association-routes.test.ts
```

Expected: FAIL because both route modules are missing.

- [ ] **Step 7: Implement no-redirect JSON routes**

Both route handlers return `new Response(JSON.stringify(body), ...)`, set `Content-Type: application/json`, and use `Cache-Control: public, max-age=3600, s-maxage=86400` on valid responses.

Apple `GET` always returns the static builder result with status 200. Android `GET` calls `buildAndroidAssetLinks(process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS)` inside `try/catch`; on validation error return status 503, `{ "error": "Android App Links are not configured" }`, and `Cache-Control: no-store`.

Do not add a redirect in `next.config.ts`; these exact paths must be directly served.

- [ ] **Step 8: Add deployment configuration documentation**

Append to `.env.example`:

```dotenv
# Android verified App Links. Comma-separated SHA-256 signing certificate
# fingerprints from Play Console > App integrity. Include the Play App Signing
# fingerprint used on installed production builds; optionally include the local
# release/upload certificate for directly installed release builds.
ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS=AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA
```

The repeated `AA` example is syntactically valid but explicitly documented as an example, not a production value.

- [ ] **Step 9: Run all association tests and type checking**

Run:

```bash
npx vitest run src/lib/deep-links/associations.test.ts src/app/.well-known/association-routes.test.ts
npx tsc --noEmit
```

Expected: all tests and TypeScript PASS.

- [ ] **Step 10: Commit association endpoints**

```bash
git add .env.example src/lib/deep-links/associations.ts src/lib/deep-links/associations.test.ts src/app/.well-known/apple-app-site-association/route.ts src/app/.well-known/assetlinks.json/route.ts src/app/.well-known/association-routes.test.ts
git commit -m "feat: publish mobile link associations"
```

---

### Task 6: Cold- and warm-start native track routing

**Files:**
- Create: `src/lib/deep-links/nativeTrackLinks.ts`
- Create: `src/lib/deep-links/nativeTrackLinks.test.ts`
- Create: `src/components/layout/NativeDeepLinkHandler.tsx`
- Create: `src/components/layout/NativeDeepLinkHandler.test.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `ios/App/App/App.entitlements`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Regenerate: `android/capacitor.settings.gradle`
- Regenerate: `android/app/capacitor.build.gradle`
- Regenerate: `android/app/src/main/assets/capacitor.config.json`
- Regenerate: `android/app/src/main/assets/capacitor.plugins.json`
- Regenerate: `ios/App/Podfile`
- Regenerate: `ios/App/Podfile.lock`
- Regenerate: `ios/App/App/capacitor.config.json`

**Interfaces:**
- Produces: `parseNativeTrackLink(url): string | null` and `registerNativeTrackLinks(app, navigation): Promise<() => Promise<void>>`.
- `NativeLinkApp` exposes `getLaunchUrl()` and `addListener("appUrlOpen", listener)`; `NativeLinkNavigation` exposes `currentPath()` and `push(path)`.

- [ ] **Step 1: Write failing parser and lifecycle tests**

Create `nativeTrackLinks.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  parseNativeTrackLink,
  registerNativeTrackLinks,
  type NativeLinkApp,
} from "./nativeTrackLinks";

describe("parseNativeTrackLink", () => {
  it.each([
    ["https://www.hymnz.com/track/carry-on", "/track/carry-on"],
    ["https://www.hymnz.com/track/carry%20on", "/track/carry%20on"],
  ])("accepts %s", (input, expected) => {
    expect(parseNativeTrackLink(input)).toBe(expected);
  });

  it.each([
    "http://www.hymnz.com/track/carry-on",
    "https://hymnz.com/track/carry-on",
    "https://www.hymnz.com.evil.example/track/carry-on",
    "hymnz://track/carry-on",
    "https://www.hymnz.com/track/",
    "https://www.hymnz.com/track/carry-on/more",
    "https://www.hymnz.com/collection/all-tracks",
  ])("rejects %s", (input) => {
    expect(parseNativeTrackLink(input)).toBeNull();
  });
});

describe("registerNativeTrackLinks", () => {
  it("routes both cold and warm links and removes its listener", async () => {
    let listener: ((event: { url: string }) => void) | undefined;
    const remove = vi.fn().mockResolvedValue(undefined);
    const app: NativeLinkApp = {
      getLaunchUrl: vi.fn().mockResolvedValue({
        url: "https://www.hymnz.com/track/carry-on",
      }),
      addListener: vi.fn().mockImplementation(async (_event, callback) => {
        listener = callback;
        return { remove };
      }),
    };
    let current = "/";
    const push = vi.fn((path: string) => {
      current = path;
    });

    const cleanup = await registerNativeTrackLinks(app, {
      currentPath: () => current,
      push,
    });
    expect(push).toHaveBeenCalledWith("/track/carry-on");

    listener?.({ url: "https://www.hymnz.com/track/sands-01" });
    expect(push).toHaveBeenLastCalledWith("/track/sands-01");

    listener?.({ url: "https://evil.example/track/sands-02" });
    expect(push).toHaveBeenCalledTimes(2);

    await cleanup();
    expect(remove).toHaveBeenCalledOnce();
  });

  it("does not push a duplicate current path", async () => {
    const app: NativeLinkApp = {
      getLaunchUrl: vi.fn().mockResolvedValue({
        url: "https://www.hymnz.com/track/carry-on",
      }),
      addListener: vi.fn().mockResolvedValue({
        remove: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const push = vi.fn();
    await registerNativeTrackLinks(app, {
      currentPath: () => "/track/carry-on",
      push,
    });
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run native helper tests and verify RED**

Run:

```bash
npx vitest run src/lib/deep-links/nativeTrackLinks.test.ts
```

Expected: FAIL because the native helper does not exist.

- [ ] **Step 3: Implement the strict parser and shared registration path**

Create `nativeTrackLinks.ts` with these exact interfaces. Parsing uses `new URL`, exact scheme/hostname checks, an empty port check, and the pathname match below:

```ts
export interface NativeLinkApp {
  getLaunchUrl(): Promise<{ url: string } | undefined>;
  addListener(
    eventName: "appUrlOpen",
    listener: (event: { url: string }) => void
  ): Promise<{ remove(): Promise<void> }>;
}

export interface NativeLinkNavigation {
  currentPath(): string;
  push(path: string): void;
}

const TRACK_PATH = /^\/track\/[^/]+$/;

export function parseNativeTrackLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "www.hymnz.com" ||
      url.port !== "" ||
      !TRACK_PATH.test(url.pathname)
    ) {
      return null;
    }
    return url.pathname;
  } catch {
    return null;
  }
}
```

`registerNativeTrackLinks` defines one `handle(url)` function, calls it for `await app.getLaunchUrl()`, registers it for `appUrlOpen`, compares each accepted path with `navigation.currentPath()`, and returns an async cleanup that removes the plugin listener.

- [ ] **Step 4: Run helper tests and verify GREEN**

Run:

```bash
npx vitest run src/lib/deep-links/nativeTrackLinks.test.ts
```

Expected: parser and lifecycle tests PASS.

- [ ] **Step 5: Write failing React bridge tests**

Create `NativeDeepLinkHandler.test.tsx` with jsdom. Mock `Capacitor.isNativePlatform`, `App`, `useRouter`, and `registerNativeTrackLinks`. Assert:

1. web render never calls `registerNativeTrackLinks`;
2. native render calls it once with `App` and a navigation object;
3. invoking `navigation.push("/track/sands-01")` calls the real mocked router's `push`; and
4. unmount calls the async cleanup returned by registration.

The component itself returns `null`; test side effects, not markup.

- [ ] **Step 6: Run bridge tests and verify RED**

Run:

```bash
npx vitest run src/components/layout/NativeDeepLinkHandler.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 7: Implement and mount the native-only bridge**

Create `NativeDeepLinkHandler.tsx` as a client component. In one `useEffect`:

```tsx
let cancelled = false;
let cleanup: (() => Promise<void>) | undefined;

if (Capacitor.isNativePlatform()) {
  void registerNativeTrackLinks(App, {
    currentPath: () => window.location.pathname,
    push: (path) => router.push(path),
  })
    .then(async (registeredCleanup) => {
      if (cancelled) {
        await registeredCleanup();
        return;
      }
      cleanup = registeredCleanup;
    })
    .catch((error: unknown) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[NativeDeepLinkHandler] initialization failed", error);
      }
    });
}

return () => {
  cancelled = true;
  void cleanup?.();
};
```

Mount `<NativeDeepLinkHandler />` beside `<NativeBootstrap />` in `src/app/layout.tsx`, so it is created once for the app lifetime.

- [ ] **Step 8: Run bridge/helper tests and type checking**

Run:

```bash
npx vitest run src/lib/deep-links/nativeTrackLinks.test.ts src/components/layout/NativeDeepLinkHandler.test.tsx
npx tsc --noEmit
```

Expected: all native-link tests and TypeScript PASS.

- [ ] **Step 9: Sync Capacitor plugin registries**

Run:

```bash
npm run cap:sync
```

Expected: generated Android and iOS files register `@capacitor/app` and `@capacitor/share`; CocoaPods finishes successfully. Inspect the diff and keep only generated plugin changes attributable to those two packages.

- [ ] **Step 10: Add iOS Associated Domains entitlement**

In `ios/App/App/App.entitlements`, add without changing existing push or Apple Sign-In keys:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:www.hymnz.com</string>
</array>
```

Confirm the Xcode target still uses `App/App.entitlements` for Debug and Release.

- [ ] **Step 11: Add Android's verified track intent filter**

Inside `MainActivity` in `AndroidManifest.xml`, after the launcher filter, add:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="www.hymnz.com"
        android:pathPrefix="/track/" />
</intent-filter>
```

Do not claim the apex host or non-track paths.

- [ ] **Step 12: Build native projects far enough to validate configuration**

Run Android tests/build configuration:

```bash
cd android
./gradlew test
cd ..
```

Run an unsigned iOS simulator build:

```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

Expected: both commands succeed with the App and Share plugins registered.

- [ ] **Step 13: Commit native routing and platform configuration**

Stage only the files named by this task plus generated Capacitor changes verified in Step 9:

```bash
git add package.json package-lock.json src/lib/deep-links/nativeTrackLinks.ts src/lib/deep-links/nativeTrackLinks.test.ts src/components/layout/NativeDeepLinkHandler.tsx src/components/layout/NativeDeepLinkHandler.test.tsx src/app/layout.tsx ios/App/App/App.entitlements ios/App/Podfile ios/App/Podfile.lock ios/App/App/capacitor.config.json android/app/src/main/AndroidManifest.xml android/capacitor.settings.gradle android/app/capacitor.build.gradle android/app/src/main/assets/capacitor.config.json android/app/src/main/assets/capacitor.plugins.json
git commit -m "feat: route verified track links into native apps"
```

---

### Task 7: Release checklist and complete verification

**Files:**
- Create: `docs/release/track-deep-links.md`
- Test: all files changed in Tasks 1–6

**Interfaces:**
- Consumes: production deployment, Play App Signing fingerprint, TestFlight build, Android internal-test build.
- Produces: an explicit repeatable release gate; no new runtime interface.

- [ ] **Step 1: Write the release checklist**

Create `docs/release/track-deep-links.md` with these exact sections and commands:

1. **Production configuration** — copy the SHA-256 value from Play Console → Setup → App integrity → App signing key certificate into `ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS`. If direct release builds must work, run `cd android && ./gradlew signingReport` and append the release fingerprint separated by a comma.
2. **Website verification** — after deploy, run:

```bash
curl --fail --silent --show-error --dump-header /tmp/hymnz-aasa.headers --output /tmp/hymnz-aasa.json https://www.hymnz.com/.well-known/apple-app-site-association
curl --fail --silent --show-error --dump-header /tmp/hymnz-assetlinks.headers --output /tmp/hymnz-assetlinks.json https://www.hymnz.com/.well-known/assetlinks.json
curl --fail --silent --show-error --output /tmp/hymnz-track.html https://www.hymnz.com/track/sands-01
rg -n "HTTP/|content-type|location" /tmp/hymnz-aasa.headers /tmp/hymnz-assetlinks.headers
rg -n "og:url|og:image|twitter:image" /tmp/hymnz-track.html
```

Require HTTP 200, `application/json`, no `Location` header, the production app/package identifiers, and the branded image URL.

3. **Android verification** — with the internal-test app installed:

```bash
adb shell pm set-app-links --package com.hymnz.app 0 all
adb shell pm verify-app-links --re-verify com.hymnz.app
adb shell pm get-app-links com.hymnz.app
adb shell am start -W -a android.intent.action.VIEW -d "https://www.hymnz.com/track/sands-01" com.hymnz.app
```

Require `www.hymnz.com` to be verified and the last command to land on the paused track page.

4. **iOS verification** — use a fresh TestFlight install, send `https://www.hymnz.com/track/sands-01` through Messages, and test with HYMNZ terminated, backgrounded, and foregrounded. A simulator smoke test may use:

```bash
xcrun simctl openurl booted "https://www.hymnz.com/track/sands-01"
```

5. **Fallback/share matrix** — uninstall each app and confirm the link opens the same web track page. From web, iOS, and Android, share to Messages and one social destination; require artwork/title/artist/logo preview, tappable canonical URL, no autoplay, and correct playback after one Play tap.

- [ ] **Step 2: Run focused tests for every new boundary**

Run:

```bash
npx vitest run src/lib/share/shareData.test.ts src/lib/share/systemShare.test.ts src/components/share/ShareSheet.test.tsx 'src/app/(app)/track/[id]/TrackLanding.test.tsx' 'src/app/(app)/track/[id]/page.test.tsx' 'src/app/(app)/track/[id]/opengraph-image.test.tsx' src/lib/deep-links/associations.test.ts src/app/.well-known/association-routes.test.ts src/lib/deep-links/nativeTrackLinks.test.ts src/components/layout/NativeDeepLinkHandler.test.tsx
```

Expected: all new tests PASS with no warnings or unhandled rejections.

- [ ] **Step 3: Run the complete web verification suite**

Run:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: every command exits 0. Investigate and fix any warning caused by this change; do not alter unrelated pre-existing warnings without authorization.

- [ ] **Step 4: Review the complete diff against the spec**

Run:

```bash
git status --short
git diff --check
git diff --stat HEAD~6..HEAD
```

Confirm every changed runtime line maps to the approved spec, no secrets or signing files are staged, the two user-owned untracked paths `.agents/` and `AGENTS.md` remain untouched, and no production link uses localhost, the apex host, or a preview origin.

- [ ] **Step 5: Commit the release checklist**

```bash
git add docs/release/track-deep-links.md
git commit -m "docs: add track deep-link release checks"
```

- [ ] **Step 6: Record external release gates in the handoff**

Report local test/build results separately from these external checks, which cannot be claimed until actually performed:

- production fingerprint environment value configured;
- both `.well-known` production endpoints verified;
- deployed Open Graph image verified from an unauthenticated request;
- TestFlight cold/background/foreground cases passed;
- Android internal-test verification and lifecycle cases passed; and
- Messages/social preview matrix passed.

Do not describe the feature as fully released while any external gate remains incomplete.
