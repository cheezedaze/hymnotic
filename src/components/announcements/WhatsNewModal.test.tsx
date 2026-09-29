import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const playback = vi.hoisted(() => ({ isPlaying: false, currentTrack: null as null | { id: string } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/store/playerStore", () => ({ usePlayerStore: (selector: (state: typeof playback) => unknown) => selector(playback) }));
import { WhatsNewModal } from "./WhatsNewModal";

const announcement = { id: 1, title: "New song", body: "<p>Listen</p>", publishedAt: null, actionType: "track" as const, actionTrackId: "song" };

describe("announcement buttons", () => {
  it.each([false, true])("only offers Up Next while a song is playing: %s", (isPlaying) => {
    playback.isPlaying = isPlaying;
    playback.currentTrack = { id: "current" };
    const html = renderToStaticMarkup(<WhatsNewModal announcement={announcement} onDismiss={() => {}} />);
    expect(html).toContain("Play Now");
    expect(html).toContain("Dismiss");
    expect(html.includes("Add to Up Next")).toBe(isPlaying);
  });
  it("renders the custom link label and supports announcements without actions", () => {
    const html = renderToStaticMarkup(<WhatsNewModal announcement={{ ...announcement, actionType: "link", actionUrl: "https://youtube.com/watch?v=abc", actionLabel: "Watch Video" }} onDismiss={() => {}} />);
    expect(html).toContain("Watch Video");
    expect(html).not.toContain("Play Now");
    const plain = renderToStaticMarkup(<WhatsNewModal announcement={{ ...announcement, actionType: null }} onDismiss={() => {}} />);
    expect(plain).not.toContain("Play Now");
    expect(plain).toContain("Dismiss");
  });
});
