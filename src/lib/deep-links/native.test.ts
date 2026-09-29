import { describe, expect, it, vi } from "vitest";
import type { AppPlugin, URLOpenListenerEvent } from "@capacitor/app";
import { connectTrackLinks } from "./native";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function harness(launch = Promise.resolve<{ url: string } | undefined>({ url: "https://www.hymnz.com/track/cold" })) {
  let listener: (event: URLOpenListenerEvent) => void = () => {};
  const remove = vi.fn().mockResolvedValue(undefined);
  const app = {
    addListener: vi.fn().mockImplementation(async (_event, fn) => { listener = fn; return { remove }; }),
    getLaunchUrl: vi.fn().mockReturnValue(launch),
  } as unknown as Pick<AppPlugin, "addListener" | "getLaunchUrl">;
  const navigate = vi.fn();
  const stop = connectTrackLinks(app, navigate);
  return { navigate, stop, remove, open: (url: string) => listener({ url }) };
}

describe("native track URL lifecycle", () => {
  it("handles cold and warm launches, suppresses duplicate delivery, and cleans up", async () => {
    const h = harness();
    await tick();
    expect(h.navigate).toHaveBeenCalledWith("/track/cold");
    h.open("https://www.hymnz.com/track/cold");
    expect(h.navigate).toHaveBeenCalledTimes(1);
    h.open("https://www.hymnz.com/track/warm?play=1");
    expect(h.navigate).toHaveBeenLastCalledWith("/track/warm");
    h.open("https://evil.test/track/warm");
    expect(h.navigate).toHaveBeenCalledTimes(2);
    h.stop();
    h.open("https://www.hymnz.com/track/later");
    expect(h.remove).toHaveBeenCalledTimes(1);
    expect(h.navigate).toHaveBeenCalledTimes(2);
  });
  it("keeps a newer warm URL when launch lookup resolves late", async () => {
    let resolve!: (value: { url: string }) => void;
    const h = harness(new Promise((done) => { resolve = done; }));
    await tick();
    h.open("https://www.hymnz.com/track/new");
    resolve({ url: "https://www.hymnz.com/track/old" });
    await tick();
    expect(h.navigate.mock.calls).toEqual([["/track/new"]]);
    h.stop();
  });
  it("removes a listener that registers after unmount without navigating", async () => {
    const h = harness();
    h.stop();
    await tick();
    expect(h.remove).toHaveBeenCalledTimes(1);
    expect(h.navigate).not.toHaveBeenCalled();
  });
});
