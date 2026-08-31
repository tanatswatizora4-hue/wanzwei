import { describe, expect, it } from "vitest";

import {
  classifyRegistryMatch,
  professionsCompatible,
  statusForMatchOutcome,
  type RegistryMatchRecord,
} from "./match";

const AS_OF = new Date("2026-08-31T12:00:00+02:00");

function row(
  overrides: Partial<RegistryMatchRecord> = {},
): RegistryMatchRecord {
  return {
    id: "reg-1",
    registeringBody: "HPA",
    registrationNumberNormalized: "P0164202026",
    fullNameNormalized: "TINASHE MOYO",
    qualification: "PHARMACIST",
    qualificationNormalized: "PHARMACIST",
    expiryDate: "2027-02-28",
    isPlaceholder: false,
    licenceClass: "P01",
    licenceSerial: "6420",
    ...overrides,
  };
}

const baseInput = {
  registeringBody: "HPA",
  registrationNumber: "P01-6420-2026",
  submittedName: "Tinashe Moyo",
  submittedProfession: "Pharmacist",
  asOf: AS_OF,
};

describe("classifyRegistryMatch", () => {
  it("auto-verifies a unique active HPA pharmacist match", () => {
    const result = classifyRegistryMatch({ ...baseInput, rows: [row()] });
    expect(result).toMatchObject({
      outcome: "matched",
      autoVerify: true,
      matchedRegistryId: "reg-1",
    });
    expect(statusForMatchOutcome(result.outcome, result.autoVerify)).toBe(
      "Verified",
    );
  });

  it("does not use name as the primary key and reports name_mismatch after a number match", () => {
    const result = classifyRegistryMatch({
      ...baseInput,
      submittedName: "Someone Else",
      rows: [row()],
    });
    expect(result.outcome).toBe("name_mismatch");
    expect(result.autoVerify).toBe(false);
    expect(result.matchedRegistryId).toBe("reg-1");
  });

  it("returns expired for a unique lapsed registration", () => {
    const result = classifyRegistryMatch({
      ...baseInput,
      rows: [row({ expiryDate: "2026-06-30" })],
    });
    expect(result.outcome).toBe("expired");
    expect(result.autoVerify).toBe(false);
    expect(statusForMatchOutcome(result.outcome, result.autoVerify)).toBe(
      "Under Review",
    );
  });

  it("returns not_found when the number is absent", () => {
    const result = classifyRegistryMatch({ ...baseInput, rows: [] });
    expect(result.outcome).toBe("not_found");
    expect(result.autoVerify).toBe(false);
  });

  it("never auto-verifies P03-0000 placeholders", () => {
    const result = classifyRegistryMatch({
      ...baseInput,
      registrationNumber: "P03-0000-2026",
      rows: [
        row({
          id: "ph-1",
          registrationNumberNormalized: "P0300002026",
          isPlaceholder: true,
          licenceClass: "P03",
          licenceSerial: "0000",
          fullNameNormalized: "BATSIRAI MUKOKA",
        }),
        row({
          id: "ph-2",
          registrationNumberNormalized: "P0300002026",
          isPlaceholder: true,
          licenceClass: "P03",
          licenceSerial: "0000",
          fullNameNormalized: "BRENDA TATENDA MANDEYA",
        }),
      ],
    });
    expect(result.outcome).toBe("ambiguous");
    expect(result.autoVerify).toBe(false);
  });

  it("never auto-verifies a single placeholder row", () => {
    const result = classifyRegistryMatch({
      ...baseInput,
      registrationNumber: "P03-0000-2026",
      submittedName: "Batsirai Mukoka",
      rows: [
        row({
          registrationNumberNormalized: "P0300002026",
          isPlaceholder: true,
          licenceClass: "P03",
          licenceSerial: "0000",
          fullNameNormalized: "BATSIRAI MUKOKA",
        }),
      ],
    });
    expect(result.autoVerify).toBe(false);
    expect(result.outcome).toBe("ambiguous");
  });

  it("never auto-verifies SALES REPRESENTATIVE", () => {
    const result = classifyRegistryMatch({
      ...baseInput,
      submittedProfession: "Sales Representative",
      rows: [
        row({
          qualification: "SALES REPRESENTATIVE",
          qualificationNormalized: "SALES REPRESENTATIVE",
        }),
      ],
    });
    expect(result.outcome).toBe("non_clinical_qualification");
    expect(result.autoVerify).toBe(false);
  });

  it("returns profession_mismatch when the submitted profession conflicts", () => {
    const result = classifyRegistryMatch({
      ...baseInput,
      submittedProfession: "Registered Nurse",
      rows: [row()],
    });
    expect(result.outcome).toBe("profession_mismatch");
    expect(result.autoVerify).toBe(false);
  });

  it("returns missing_registration_number for a blank number", () => {
    const result = classifyRegistryMatch({
      ...baseInput,
      registrationNumber: "  ",
      rows: [row()],
    });
    expect(result.outcome).toBe("missing_registration_number");
    expect(result.autoVerify).toBe(false);
  });

  it("never auto-verifies a malformed P03-0000 number when flags/class/serial are wrong", () => {
    const result = classifyRegistryMatch({
      ...baseInput,
      registrationNumber: "P03-0000-2026",
      rows: [
        row({
          registrationNumberNormalized: "P0300002026",
          isPlaceholder: false,
          licenceClass: "P01",
          licenceSerial: "6420",
          fullNameNormalized: "TINASHE MOYO",
        }),
      ],
    });
    expect(result.autoVerify).toBe(false);
    expect(result.outcome).toBe("ambiguous");
  });

  it("sends unknown matching titles to manual review", () => {
    const result = classifyRegistryMatch({
      ...baseInput,
      submittedProfession: "Dentist",
      rows: [
        row({
          qualification: "DENTIST",
          qualificationNormalized: "DENTIST",
        }),
      ],
    });
    expect(result.autoVerify).toBe(false);
    expect(result.outcome).toBe("profession_mismatch");
  });
});

describe("professionsCompatible", () => {
  it("treats pharmacist aliases as compatible and nurse vs pharmacist as not", () => {
    expect(professionsCompatible("Pharmacist", "PHARMACIST")).toBe(true);
    expect(professionsCompatible("Pharmacy Tech", "PHARMACY TECHNICIAN")).toBe(
      true,
    );
    expect(professionsCompatible("RN", "REGISTERED NURSE")).toBe(true);
    expect(
      professionsCompatible("IND Clinic Nurse", "INDEPENDENT CLINIC NURSE"),
    ).toBe(true);
    expect(professionsCompatible("Nurse", "PHARMACIST")).toBe(false);
  });

  it("does not treat midwife as generic nurse and does not auto-qualify unknown equals", () => {
    expect(professionsCompatible("Midwife", "NURSE")).toBe(false);
    expect(professionsCompatible("Midwife", "REGISTERED NURSE")).toBe(false);
    expect(professionsCompatible("Nurse", "REGISTERED NURSE")).toBe(false);
    expect(professionsCompatible("Dentist", "DENTIST")).toBe(false);
    expect(professionsCompatible("Midwife", "MIDWIFE")).toBe(true);
  });
});
