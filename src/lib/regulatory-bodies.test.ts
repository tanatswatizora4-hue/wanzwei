import { describe, expect, it } from "vitest";

import {
  displayRegulatoryBody,
  extractedRegulatoryBodyCompatible,
  isOtherRegulatoryBody,
  parseSelectableRegulatoryBody,
  regulatoryBodySupportsHpaCorroboration,
  RegulatoryBodySchema,
} from "./regulatory-bodies";

describe("regulatory bodies", () => {
  it("parses selectable council codes and labels", () => {
    expect(parseSelectableRegulatoryBody("NCZ")).toBe("NCZ");
    expect(
      parseSelectableRegulatoryBody("Nurses Council of Zimbabwe (NCZ)"),
    ).toBe("NCZ");
    expect(parseSelectableRegulatoryBody("HPA")).toBeNull();
    expect(parseSelectableRegulatoryBody("OTHER")).toBe("OTHER");
  });

  it("never treats Other as registry corroborated", () => {
    expect(
      regulatoryBodySupportsHpaCorroboration("OTHER", "Nurse"),
    ).toBe(false);
    expect(isOtherRegulatoryBody("OTHER")).toBe(true);
  });

  it("corroborates only PCZ pharmacy and NCZ nursing families against the existing register", () => {
    expect(regulatoryBodySupportsHpaCorroboration("PCZ", "Pharmacist")).toBe(
      true,
    );
    expect(regulatoryBodySupportsHpaCorroboration("NCZ", "Nurse")).toBe(true);
    expect(regulatoryBodySupportsHpaCorroboration("NCZ", "Midwife")).toBe(true);
    expect(regulatoryBodySupportsHpaCorroboration("MDPCZ", "Pharmacist")).toBe(
      false,
    );
    expect(regulatoryBodySupportsHpaCorroboration("AHPCZ", "Physiotherapist")).toBe(
      false,
    );
  });

  it("does not invent a council label for legacy HPA values", () => {
    expect(displayRegulatoryBody("HPA")).toBe("Legacy practitioner register");
    expect(displayRegulatoryBody("OTHER", "Church health board")).toBe(
      "Church health board",
    );
  });

  it("rejects HPA as a selectable body", () => {
    expect(RegulatoryBodySchema.safeParse("HPA").success).toBe(false);
    expect(RegulatoryBodySchema.safeParse("PCZ").success).toBe(true);
  });

  it("treats unknown extracted issuing bodies as compatible", () => {
    expect(
      extractedRegulatoryBodyCompatible("NCZ", "Nurses Council of Zimbabwe"),
    ).toBe(true);
    expect(extractedRegulatoryBodyCompatible("NCZ", "PCZ")).toBe(false);
    expect(extractedRegulatoryBodyCompatible("NCZ", null)).toBe(true);
  });
});
