import { describe, expect, it } from "vitest";

import { cpdCreditProgress, creditsFromCompletedEnrolments } from "./credits";

describe("CPD credits", () => {
  it("counts credits only from completed enrolments", () => {
    expect(
      creditsFromCompletedEnrolments([
        { status: "completed", credits: 4 },
        { status: "registered", credits: 6 },
        { status: "withdrawn", credits: 2 },
        { status: "completed", credits: 1.5 },
      ]),
    ).toBe(5.5);
  });

  it("does not invent a target or remaining credits", () => {
    expect(cpdCreditProgress(8, null)).toEqual({
      earned: 8,
      target: null,
      pct: null,
      remaining: null,
    });
    expect(cpdCreditProgress(10, 40)).toEqual({
      earned: 10,
      target: 40,
      pct: 25,
      remaining: 30,
    });
  });
});
