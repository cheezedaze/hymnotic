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

  it("exposes dialog semantics and focuses its named close button", async () => {
    render(<ShareSheet />);

    const dialog = screen.getByRole("dialog", { name: "Share Carry On" });
    const close = screen.getByRole("button", { name: "Close share sheet" });

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(close));
  });

  it("closes on Escape and restores focus to the opener", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Open share sheet";
    document.body.appendChild(opener);
    opener.focus();

    render(<ShareSheet />);
    const dialog = screen.getByRole("dialog", { name: "Share Carry On" });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Close share sheet" })
      )
    );

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(useShareStore.getState().isOpen).toBe(false));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("contains forward and backward Tab focus within the dialog", async () => {
    render(<ShareSheet />);
    const dialog = screen.getByRole("dialog", { name: "Share Carry On" });
    const close = screen.getByRole("button", { name: "Close share sheet" });
    const copy = screen.getByRole("button", { name: "Copy link" });

    await waitFor(() => expect(document.activeElement).toBe(close));
    copy.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(copy);
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
