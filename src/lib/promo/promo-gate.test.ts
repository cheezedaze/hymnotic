import { describe, it, expect } from "vitest";
import { canPlayPromo, promoListenKey } from "./promo-gate";

describe("canPlayPromo", () => {
  it("allows authenticated users regardless of stored state", () => {
    expect(canPlayPromo(true, "used")).toBe(true);
    expect(canPlayPromo(true, null)).toBe(true);
  });

  it("allows anonymous users who have not used their free listen", () => {
    expect(canPlayPromo(false, null)).toBe(true);
    expect(canPlayPromo(false, "")).toBe(true);
  });

  it("blocks anonymous users after the free listen", () => {
    expect(canPlayPromo(false, "used")).toBe(false);
  });

  it("builds a per-track storage key", () => {
    expect(promoListenKey("carry-on")).toBe("hymnz-promo-listen:carry-on");
  });
});
