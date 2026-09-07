import { describe, expect, it } from "vitest";

import { registryEvidenceFromMatch } from "./registry-evidence";

describe("registry evidence provider mapping", () => {
  it("marks professions without an HPA family as UNAVAILABLE_FOR_PROFESSION", () => {
    const result = registryEvidenceFromMatch({
      submittedName: "Tinashe Moyo",
      submittedProfession: "Dentist",
      rows: [],
    });
    expect(result.outcome).toBe("UNAVAILABLE_FOR_PROFESSION");
  });

  it("does not treat a missing number for a register profession as a contradiction", () => {
    const result = registryEvidenceFromMatch({
      submittedName: "Tinashe Moyo",
      submittedProfession: "Pharmacist",
      rows: [],
    });
    expect(result.outcome).toBe("NOT_SUBMITTED");
    expect(result.outcome).not.toBe("CONTRADICTION");
  });
});
