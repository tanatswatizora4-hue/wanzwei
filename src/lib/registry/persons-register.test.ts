import { describe, expect, it } from "vitest";

import {
  deriveStatus,
  isPlaceholderRegistration,
  missingPersonsRegisterColumns,
  normalizePersonName,
  normalizeQualification,
  normalizeRegistrationNumber,
  parseExpiryDate,
  parsePersonNumber,
  parsePersonsRegisterRows,
} from "./persons-register";

const AS_OF = new Date("2026-08-30T12:00:00+02:00");

describe("HPA persons register parser", () => {
  it("parses a normal registration number into class, serial, and year", () => {
    expect(parsePersonNumber("P01-6420-2026")).toEqual({
      registrationNumber: "P01-6420-2026",
      registrationNumberNormalized: "P0164202026",
      licenceClass: "P01",
      licenceSerial: "6420",
      licenceYear: 2026,
    });
    expect(parsePersonNumber("C01-0803-2025")?.licenceClass).toBe("C01");
    expect(parsePersonNumber("D01-0194-2025")?.licenceSerial).toBe("0194");
  });

  it("normalizes lowercase registration numbers without changing the source value", () => {
    const parsed = parsePersonNumber("p01-6420-2026");
    expect(parsed?.registrationNumber).toBe("p01-6420-2026");
    expect(parsed?.registrationNumberNormalized).toBe("P0164202026");
  });

  it("strips spaces and hyphens from the normalized registration number", () => {
    expect(normalizeRegistrationNumber(" p01-6420-2026 ")).toBe("P0164202026");
    expect(normalizeRegistrationNumber("P01 6420 2026")).toBe("P0164202026");
  });

  it("treats P03-0000-2026 as a placeholder", () => {
    const parsed = parsePersonNumber("P03-0000-2026");
    expect(parsed).not.toBeNull();
    expect(
      isPlaceholderRegistration(parsed!.licenceClass, parsed!.licenceSerial),
    ).toBe(true);
  });

  it("parses US expiry dates and Excel serials", () => {
    expect(parseExpiryDate("2/28/27")).toBe("2027-02-28");
    expect(parseExpiryDate("6/30/26")).toBe("2026-06-30");
    expect(parseExpiryDate("2027-02-28")).toBe("2027-02-28");
    expect(parseExpiryDate(new Date(Date.UTC(2026, 8, 30)))).toBe("2026-09-30");
  });

  it("derives active vs expired from expiry date without storing status in the source", () => {
    expect(deriveStatus("2026-06-30", AS_OF)).toBe("expired");
    expect(deriveStatus("2026-08-30", AS_OF)).toBe("active");
    expect(deriveStatus("2027-02-28", AS_OF)).toBe("active");
  });

  it("keeps blank address and town as null after a valid parse", () => {
    const { records, issues } = parsePersonsRegisterRows(
      [
        {
          "Person No.": "P01-6420-2026",
          "Full Name": "ALOIS NGONIDZASHE MUCHAMBA",
          Qualification: "PHARMACIST",
          Address: "",
          Town: "   ",
          "Expiry Date": "2/28/27",
        },
      ],
      { asOf: AS_OF },
    );

    expect(issues).toEqual([]);
    expect(records).toHaveLength(1);
    expect(records[0]?.address).toBeNull();
    expect(records[0]?.town).toBeNull();
    expect(records[0]?.sourceRow.Address).toBe("");
  });

  it("normalizes qualification without rewriting the stored source value", () => {
    expect(normalizeQualification("  ind  clinic   nurse ")).toBe(
      "IND CLINIC NURSE",
    );
    const { records } = parsePersonsRegisterRows(
      [
        {
          "Person No.": "C01-0803-2025",
          "Full Name": "KUNDAI ELLEN TAKAWIRA",
          Qualification: "IND CLINIC NURSE",
          Address: "39 HERBERT CHITEPO STREET",
          Town: "MUTARE",
          "Expiry Date": "9/30/26",
        },
      ],
      { asOf: AS_OF },
    );
    expect(records[0]?.qualification).toBe("IND CLINIC NURSE");
    expect(records[0]?.qualificationNormalized).toBe("IND CLINIC NURSE");
  });

  it("collapses repeated whitespace only on the normalized name", () => {
    expect(normalizePersonName("KUDAKWASHE  TAGWIREYI")).toBe(
      "KUDAKWASHE TAGWIREYI",
    );
    const { records } = parsePersonsRegisterRows(
      [
        {
          "Person No.": "P01-6171-2026",
          "Full Name": "KUDAKWASHE  TAGWIREYI",
          Qualification: "PHARMACIST",
          Address: "S. MAZORODZE/AUCKLAND RD",
          Town: "HARARE",
          "Expiry Date": "2/28/27",
        },
      ],
      { asOf: AS_OF },
    );
    expect(records[0]?.fullName).toBe("KUDAKWASHE  TAGWIREYI");
    expect(records[0]?.fullNameNormalized).toBe("KUDAKWASHE TAGWIREYI");
  });

  it("rejects a malformed registration number and does not discard the row silently", () => {
    const { records, issues } = parsePersonsRegisterRows(
      [
        {
          "Person No.": "P0164202026",
          "Full Name": "AARON MUGODI",
          Qualification: "PHARMACIST",
          Address: "23 BLACKROCK RD",
          Town: "HARARE",
          "Expiry Date": "2/28/27",
        },
      ],
      { asOf: AS_OF },
    );
    expect(records).toEqual([]);
    expect(issues).toEqual([
      {
        excelRowNumber: 2,
        field: "Person No.",
        message: "Person No. is not A99-9999-YYYY",
      },
    ]);
  });

  it("rejects a missing Person No.", () => {
    const { records, issues } = parsePersonsRegisterRows(
      [
        {
          "Person No.": "  ",
          "Full Name": "AARON MUGODI",
          Qualification: "PHARMACIST",
          Address: "23 BLACKROCK RD",
          Town: "HARARE",
          "Expiry Date": "2/28/27",
        },
      ],
      { asOf: AS_OF },
    );
    expect(records).toEqual([]);
    expect(issues[0]).toMatchObject({
      field: "Person No.",
      message: "Person No. is blank",
    });
  });

  it("stops on duplicate non-placeholder registration numbers", () => {
    const { issues, stats } = parsePersonsRegisterRows(
      [
        validRow("P01-6420-2026", "PERSON ONE"),
        validRow("P01-6420-2026", "PERSON TWO"),
      ],
      { asOf: AS_OF },
    );
    expect(stats.duplicateNonPlaceholderNumbers).toHaveLength(1);
    expect(issues.some((issue) => issue.message.includes("Duplicate"))).toBe(
      true,
    );
  });

  it("allows six placeholder rows that share P03-0000-2026 when names differ", () => {
    const { records, issues } = parsePersonsRegisterRows(
      [
        validRow("P03-0000-2026", "BATSIRAI MUKOKA"),
        validRow("P03-0000-2026", "BRENDA TATENDA MANDEYA"),
      ],
      { asOf: AS_OF },
    );
    expect(issues).toEqual([]);
    expect(records).toHaveLength(2);
    expect(records.every((row) => row.isPlaceholder)).toBe(true);
  });

  it("reports missing expected columns", () => {
    expect(
      missingPersonsRegisterColumns(["Licence No.", "Premises Name"]),
    ).toEqual([
      "Person No.",
      "Full Name",
      "Qualification",
      "Address",
      "Town",
      "Expiry Date",
    ]);
  });
});

function validRow(personNo: string, name: string) {
  return {
    "Person No.": personNo,
    "Full Name": name,
    Qualification: "PHARMACIST",
    Address: "23 BLACKROCK RD",
    Town: "HARARE",
    "Expiry Date": "2/28/27",
  };
}
