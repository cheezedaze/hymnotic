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
