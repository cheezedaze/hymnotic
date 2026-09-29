import { describe, expect, it } from "vitest";
import { noAnnouncementAction, parseAnnouncementAction } from "./actions";

describe("announcement actions", () => {
  it("keeps old announcements dismiss-only and clears stale fields", () => {
    expect(parseAnnouncementAction({})).toEqual(noAnnouncementAction);
    expect(parseAnnouncementAction({ actionType: null, actionUrl: "https://example.com" })).toEqual(noAnnouncementAction);
    expect(parseAnnouncementAction({ actionType: "track", actionTrackId: "song", actionUrl: "https://example.com" })).toEqual({ ...noAnnouncementAction, actionType: "track", actionTrackId: "song" });
  });
  it.each(["https://www.youtube.com/watch?v=123", "/about", "/library?tab=updates"])("accepts an ordinary link: %s", (actionUrl) => {
    expect(parseAnnouncementAction({ actionType: "link", actionUrl, actionLabel: " Watch Video " }).actionLabel).toBe("Watch Video");
  });
  it.each(["javascript:alert(1)", "data:text/html,hello", "//example.com", "/\\example.com", "https://user:pass@example.com", "http://example.com", "https://exam\nple.com"])("rejects unsafe URLs: %s", (actionUrl) => {
    expect(() => parseAnnouncementAction({ actionType: "link", actionUrl, actionLabel: "Open" })).toThrow();
  });
  it("requires a destination and a label for links", () => {
    expect(() => parseAnnouncementAction({ actionType: "track" })).toThrow("Choose a track");
    expect(() => parseAnnouncementAction({ actionType: "link", actionUrl: "https://example.com" })).toThrow("button text");
  });
});
