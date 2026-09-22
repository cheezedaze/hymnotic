import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TrackRelease } from "@/lib/db/schema";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
import { TrackReleasePanel } from "./TrackReleasePanel";

const release = (status: TrackRelease["status"]): TrackRelease => ({
  trackId: "track", status, scheduledAt: new Date("2026-01-01T00:00:00Z"),
  announcementTitle: "Original announcement", announcementBody: "<p>Listen</p>",
  pushTitle: "Original push", pushBody: "Listen", error: null,
  sentCount: 5, failedCount: 0, updatedAt: new Date(),
});

const render = (isActive: boolean, initialRelease: TrackRelease | null) => renderToStaticMarkup(
  <TrackReleasePanel trackId="track" title="Song" artworkUrl="" isActive={isActive}
    initialRelease={initialRelease} disabledReason="" onReleased={() => {}} />
);

describe("inactive track release options", () => {
  it.each([null, "completed", "attention"] as const)("offers immediate and scheduled activation with a %s previous release", (status) => {
    const html = render(false, status ? release(status) : null);
    expect(html).toContain("Release now");
    expect(html).toContain("Schedule release");
    expect(html).toContain("Publish a release announcement");
    expect(html).toContain("Send a release push notification");
    expect(html).not.toContain("Release date and time");
    expect(html).not.toContain("Update schedule");
  });
  it("shows the existing schedule for an inactive track", () => {
    const html = render(false, release("scheduled"));
    expect(html).toContain("Update schedule");
    expect(html).toContain("Cancel schedule");
  });
  it("shows status while active", () => {
    const html = render(true, release("completed"));
    expect(html).toContain("The track is active.");
    expect(html).not.toContain("<form");
  });
  it.each(["published", "sending"] as const)("waits for a %s push to finish before another release", (status) => {
    const html = render(false, release(status));
    expect(html).toContain("Wait for the current push delivery");
    expect(html).not.toContain("<form");
  });
});
