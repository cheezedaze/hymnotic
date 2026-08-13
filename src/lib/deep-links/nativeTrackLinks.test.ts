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
