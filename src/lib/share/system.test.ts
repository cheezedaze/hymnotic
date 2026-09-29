import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ native: vi.fn(), available: vi.fn(), share: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: mocks.native, isPluginAvailable: mocks.available } }));
vi.mock("@capacitor/share", () => ({ Share: { share: mocks.share } }));
import { systemShare } from "./system";
const data = { type: "track" as const, id: "song", title: "Song", artist: "HYMNZ" };
beforeEach(() => { vi.clearAllMocks(); mocks.native.mockReturnValue(true); mocks.available.mockReturnValue(true); mocks.share.mockResolvedValue({}); });

describe("system sharing", () => {
  it("shares a canonical link through Capacitor without image attachments", async () => {
    expect(await systemShare(data)).toBe("shared");
    expect(mocks.share).toHaveBeenCalledWith({ title: "Song", text: "Listen to “Song” by HYMNZ on HYMNZ", url: "https://www.hymnz.com/track/song", dialogTitle: "Share HYMNZ" });
  });
  it("leaves copy-link available on older native builds and cancellation", async () => {
    mocks.available.mockReturnValue(false);
    expect(await systemShare(data)).toBe("unavailable");
    expect(mocks.share).not.toHaveBeenCalled();
    mocks.available.mockReturnValue(true);
    mocks.share.mockRejectedValue(new Error("Share canceled"));
    expect(await systemShare(data)).toBe("cancelled");
  });
  it("calls the browser API synchronously from the tap", async () => {
    mocks.native.mockReturnValue(false);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    const pending = systemShare(data);
    expect(share).toHaveBeenCalledTimes(1);
    expect(await pending).toBe("shared");
    vi.unstubAllGlobals();
  });
});
