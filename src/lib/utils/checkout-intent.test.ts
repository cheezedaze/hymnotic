import { describe, it, expect } from "vitest";
import { getPlanFromNext, getPostAuthUrl } from "./checkout-intent";

describe("getPlanFromNext", () => {
  it("extracts monthly from a subscribe next path", () => {
    expect(getPlanFromNext("/subscribe?plan=monthly")).toBe("monthly");
  });

  it("extracts yearly from a subscribe next path", () => {
    expect(getPlanFromNext("/subscribe?plan=yearly")).toBe("yearly");
  });

  it("returns null when no plan is present", () => {
    expect(getPlanFromNext("/subscribe")).toBeNull();
    expect(getPlanFromNext("/subscribe?welcome=1")).toBeNull();
    expect(getPlanFromNext("/")).toBeNull();
  });

  it("returns null for unknown plan values", () => {
    expect(getPlanFromNext("/subscribe?plan=lifetime")).toBeNull();
  });

  it("ignores plan params outside /subscribe", () => {
    expect(getPlanFromNext("/collection/abc?plan=monthly")).toBeNull();
  });
});

describe("getPostAuthUrl", () => {
  it("routes checkout intent to auto-resumed checkout", () => {
    expect(getPostAuthUrl("/subscribe?plan=monthly")).toBe(
      "/subscribe?plan=monthly&checkout=1"
    );
    expect(getPostAuthUrl("/subscribe?plan=yearly")).toBe(
      "/subscribe?plan=yearly&checkout=1"
    );
  });

  it("passes through paths without checkout intent", () => {
    expect(getPostAuthUrl("/")).toBe("/");
    expect(getPostAuthUrl("/subscribe?welcome=1")).toBe("/subscribe?welcome=1");
  });
});
