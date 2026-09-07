import { describe, expect, it } from "vitest";

import { namesAreCompatible, tokenizePersonName } from "./name-match";

describe("verification name comparison", () => {
  it("matches formatting variants of the same person", () => {
    expect(namesAreCompatible("TANATSWA TIZORA", "Tanatswa Tizora")).toBe(true);
    expect(namesAreCompatible("T. Tizora", "TANATSWA TIZORA")).toBe(true);
    expect(namesAreCompatible("TANATSWA M TIZORA", "TANATSWA TIZORA")).toBe(true);
  });

  it("rejects obviously different people", () => {
    expect(namesAreCompatible("Jane Smith", "John Smith")).toBe(false);
    expect(namesAreCompatible("A Tizora", "Tanatswa Tizora")).toBe(false);
    expect(namesAreCompatible("Tinashe Moyo", "Tanatswa Tizora")).toBe(false);
  });

  it("tokenizes punctuation and extra whitespace", () => {
    expect(tokenizePersonName("  Tanatswa,  Tizora ")).toEqual([
      "TANATSWA",
      "TIZORA",
    ]);
  });
});
