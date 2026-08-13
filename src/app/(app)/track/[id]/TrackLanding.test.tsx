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

  it("shows HYMNZ branding when artwork is unavailable", () => {
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

    expect(screen.getByRole("img", { name: "HYMNZ" })).toBeTruthy();
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
