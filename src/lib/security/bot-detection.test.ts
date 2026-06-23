import { describe, it, expect } from "vitest";
import { looksGibberish, gmailDotCount, gmailCanonical } from "./bot-detection";

describe("looksGibberish", () => {
  it("flags random base64-style bot names", () => {
    for (const n of [
      "KRIgLssCUBhsCiQUfMM",
      "EFpIvvZFSEQAlrBRdAgNvdhT",
      "wxBQYPsfsWDVdtGgoAFY",
      "CtohtmMcBMzUbYpJ",
    ]) {
      expect(looksGibberish(n)).toBe(true);
    }
  });

  it("does NOT flag real names", () => {
    for (const n of [
      "John Smith",
      "Mary",
      "Christopher",
      "McDonald",
      "JohnDoe",
      "Jean-Luc",
      "Sarah O'Brien",
      "Krzysztof",
      "Schwartz",
      "Przybylski",
      "Strzelczyk",
      "Nguyen",
      null,
      "",
    ]) {
      expect(looksGibberish(n)).toBe(false);
    }
  });
});

describe("gmailDotCount", () => {
  it("counts dots in gmail/googlemail local parts", () => {
    expect(gmailDotCount("g.a.ho.gu.k.342@gmail.com")).toBe(5);
    expect(gmailDotCount("a.j.u.h.a.pi4.0.4@gmail.com")).toBe(7);
    expect(gmailDotCount("normal@gmail.com")).toBe(0);
  });

  it("returns 0 for non-gmail domains", () => {
    expect(gmailDotCount("first.last@uhaul.com")).toBe(0);
    expect(gmailDotCount("a.b.c@yahoo.com")).toBe(0);
  });
});

describe("gmailCanonical", () => {
  it("strips dots and +suffix for gmail", () => {
    expect(gmailCanonical("j.e.re.m.y+news@gmail.com")).toBe("jeremy@gmail.com");
    expect(gmailCanonical("Normal@googlemail.com")).toBe("normal@gmail.com");
  });
  it("returns null for non-gmail", () => {
    expect(gmailCanonical("a@uhaul.com")).toBeNull();
  });
});
