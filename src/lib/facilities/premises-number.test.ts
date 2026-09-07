import { describe, expect, it } from "vitest";

import {
  isValidPremisesNumber,
  normalizePremisesNumber,
  parsePremisesNumberInput,
} from "./premises-number";

describe("premises number", () => {
  it("normalizes whitespace and case without inventing a strict format", () => {
    expect(normalizePremisesNumber("  w01-2026-1234  ")).toBe("W01-2026-1234");
    expect(normalizePremisesNumber("w 01 2026 12")).toBe("W01202612");
    expect(normalizePremisesNumber("   ")).toBeNull();
    expect(isValidPremisesNumber("W01-2026-1234")).toBe(true);
    expect(isValidPremisesNumber("ABC/99-2024")).toBe(true);
    expect(isValidPremisesNumber("ab")).toBe(false);
    expect(isValidPremisesNumber("W01 2026!!!!")).toBe(false);
    expect(parsePremisesNumberInput("")).toEqual({ ok: true, value: null });
    expect(parsePremisesNumberInput(" w01-2026-0042 ")).toEqual({
      ok: true,
      value: "W01-2026-0042",
    });
  });
});
