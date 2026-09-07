import { describe, expect, it } from "vitest";

import {
  extractedProfessionCompatible,
  mapExtractedProfession,
  professionRequiresCurrentAuthorization,
} from "./profession-map";

describe("extracted profession mapping", () => {
  it("maps canonical and alias titles", () => {
    expect(mapExtractedProfession("Digital Health Specialist")).toBe(
      "Digital Health Specialist",
    );
    expect(mapExtractedProfession("registered nurse")).toBe("Nurse");
  });

  it("treats HPA family titles as compatible", () => {
    expect(extractedProfessionCompatible("Nurse", "REGISTERED NURSE")).toBe(
      true,
    );
    expect(extractedProfessionCompatible("Pharmacist", "Dentist")).toBe(false);
  });

  it("requires current authorization for licensed clinical professions", () => {
    expect(professionRequiresCurrentAuthorization("Pharmacist")).toBe(true);
    expect(professionRequiresCurrentAuthorization("Dentist")).toBe(true);
    expect(
      professionRequiresCurrentAuthorization("Digital Health Specialist"),
    ).toBe(false);
  });
});
