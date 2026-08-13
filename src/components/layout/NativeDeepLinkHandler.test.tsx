// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeDeepLinkHandler } from "./NativeDeepLinkHandler";

const mocks = vi.hoisted(() => ({
  app: {
    getLaunchUrl: vi.fn(),
    addListener: vi.fn(),
  },
  cleanup: vi.fn().mockResolvedValue(undefined),
  isNativePlatform: vi.fn(),
  registerNativeTrackLinks: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
  },
}));

vi.mock("@capacitor/app", () => ({
  App: mocks.app,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock("@/lib/deep-links/nativeTrackLinks", () => ({
  registerNativeTrackLinks: mocks.registerNativeTrackLinks,
}));

describe("NativeDeepLinkHandler", () => {
  beforeEach(() => {
    mocks.cleanup.mockClear();
    mocks.isNativePlatform.mockReset();
    mocks.registerNativeTrackLinks.mockReset();
    mocks.registerNativeTrackLinks.mockResolvedValue(mocks.cleanup);
    mocks.routerPush.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not register native track links on the web", () => {
    mocks.isNativePlatform.mockReturnValue(false);

    render(<NativeDeepLinkHandler />);

    expect(mocks.registerNativeTrackLinks).not.toHaveBeenCalled();
  });

  it("registers once on native and forwards navigation to the router", async () => {
    mocks.isNativePlatform.mockReturnValue(true);

    render(<NativeDeepLinkHandler />);

    await waitFor(() => {
      expect(mocks.registerNativeTrackLinks).toHaveBeenCalledOnce();
    });
    expect(mocks.registerNativeTrackLinks).toHaveBeenCalledWith(
      mocks.app,
      expect.objectContaining({
        currentPath: expect.any(Function),
        push: expect.any(Function),
      })
    );

    const navigation = mocks.registerNativeTrackLinks.mock.calls[0]?.[1];
    navigation.push("/track/sands-01");
    expect(mocks.routerPush).toHaveBeenCalledWith("/track/sands-01");
  });

  it("removes the native listener when unmounted", async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    const view = render(<NativeDeepLinkHandler />);
    await waitFor(() => {
      expect(mocks.registerNativeTrackLinks).toHaveBeenCalledOnce();
    });

    view.unmount();

    await waitFor(() => {
      expect(mocks.cleanup).toHaveBeenCalledOnce();
    });
  });
});
