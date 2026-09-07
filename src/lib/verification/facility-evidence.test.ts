import { describe, expect, it } from "vitest";

import { evaluateFacilityPremisesEvidence } from "./facility-evidence";

describe("facility premises evidence", () => {
  it("never auto-verifies a submitted premises number", () => {
    const result = evaluateFacilityPremisesEvidence("W01-2026-0042");
    expect(result.canAutoVerify).toBe(false);
    expect(result.outcome).toBe("UNAVAILABLE");
  });
});
