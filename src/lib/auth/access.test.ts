import { describe, it, expect, vi } from "vitest";

// access.ts unconditionally imports these server-only modules (next-auth, db).
// Stub them out so this suite can exercise the pure canPlayFullTrack function
// without needing a real database or next-auth runtime.
vi.mock("./auth", () => ({ auth: async () => null }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/db/schema", () => ({ sacred7Tracks: {} }));

import { canPlayFullTrack } from "./access";

const SACRED7 = ["s1", "s2"];

describe("canPlayFullTrack", () => {
  it("paid users always get full", () => {
    expect(canPlayFullTrack("paid", "x", SACRED7)).toBe(true);
    expect(canPlayFullTrack("paid", "s1", SACRED7)).toBe(true);
  });

  it("free users get full for Sacred 7 regardless of free-listen state", () => {
    expect(canPlayFullTrack("free", "s1", SACRED7, false)).toBe(true);
  });

  it("free users get full for a non-Sacred-7 track when the free listen is available", () => {
    expect(canPlayFullTrack("free", "x", SACRED7, true)).toBe(true);
  });

  it("free users get preview for a non-Sacred-7 track once the free listen is consumed", () => {
    expect(canPlayFullTrack("free", "x", SACRED7, false)).toBe(false);
  });

  it("defaults to no free listen when the flag is omitted (back-compat)", () => {
    expect(canPlayFullTrack("free", "x", SACRED7)).toBe(false);
  });

  it("visitors never get full", () => {
    expect(canPlayFullTrack("visitor", "x", SACRED7, true)).toBe(false);
    expect(canPlayFullTrack("visitor", "s1", SACRED7, true)).toBe(false);
  });
});
