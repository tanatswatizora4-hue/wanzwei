import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("emergency alert authorization and recipient cap", () => {
  it("blocks non-facility actors from creating alerts", () => {
    const source = readFileSync(
      "src/app/(app)/facility/emergency/actions.ts",
      "utf8",
    );
    expect(source).toContain('requireRole(["facility"])');
    expect(source).toContain("createEmergencyAlert");
  });

  it("keeps emergency locum responses behind requireVerifiedProfessional", () => {
    const source = readFileSync(
      "src/app/(app)/professional/dashboard/actions.ts",
      "utf8",
    );
    const start = source.indexOf("export async function respondToAlertAction");
    const action = source.slice(start);
    expect(action).toContain("requireVerifiedProfessional");
    expect(action.indexOf("requireVerifiedProfessional")).toBeLessThan(
      action.indexOf("respondToEmergencyAlertForProfessionalEmail("),
    );
  });

  it("does not silently discard eligible recipients with a slice cap", () => {
    const source = readFileSync("src/lib/repos/emergency-alerts.ts", "utf8");
    expect(source).not.toMatch(/matched\.slice\(0,\s*\d+\)/);
    expect(source).toContain("recipientsForEmergencyAlert");
    expect(source).toContain("filterEligibleEmergencyProfessionals");
  });

  it("does not subject facility emergency creation to professional credential checks", () => {
    const source = readFileSync(
      "src/app/(app)/facility/emergency/actions.ts",
      "utf8",
    );
    expect(source).toContain('requireRole(["facility"])');
    expect(source).not.toContain("requireVerifiedProfessional");
  });
});
