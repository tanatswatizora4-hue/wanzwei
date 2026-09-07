import { describe, expect, it } from "vitest";

import { SubmitVerificationSchema } from "./verifications";

const DOCS = {
  identityDocumentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  credentialDocumentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};

describe("SubmitVerificationSchema", () => {
  it("accepts HPA credentials and identity/credential document ids", () => {
    expect(
      SubmitVerificationSchema.parse({
        registeringBody: "hpa",
        registrationNumber: "P01-6420-2026",
        profession: "Pharmacist",
        ...DOCS,
      }),
    ).toEqual({
      registeringBody: "HPA",
      registrationNumber: "P01-6420-2026",
      profession: "Pharmacist",
      ...DOCS,
    });
  });

  it("accepts spaced, compact, lowercase, and padded HPA numbers", () => {
    for (const registrationNumber of [
      "P01-6420-2026",
      "P01 6420 2026",
      "P0164202026",
      "  p01-6420-2026  ",
      "p0164202026",
    ]) {
      expect(
        SubmitVerificationSchema.parse({
          registeringBody: "HPA",
          registrationNumber,
          profession: "Pharmacist",
          ...DOCS,
        }).registrationNumber,
      ).toBe("P01-6420-2026");
    }
  });

  it("allows omitting a registration number for non-register professions", () => {
    expect(
      SubmitVerificationSchema.parse({
        profession: "Digital Health Specialist",
        ...DOCS,
      }).registrationNumber,
    ).toBeUndefined();
  });

  it("rejects an invalid registration number when one is submitted", () => {
    expect(
      SubmitVerificationSchema.safeParse({
        registeringBody: "HPA",
        registrationNumber: "not-a-licence",
        profession: "Pharmacist",
        ...DOCS,
      }).success,
    ).toBe(false);
  });

  it("rejects client-supplied verification authority fields", () => {
    for (const extra of [
      { userId: "22222222-2222-4222-8222-222222222222" },
      { verified: true },
      { decision: "verified" },
      { confidence: 0.99 },
      { registry_match: true },
    ]) {
      expect(
        SubmitVerificationSchema.safeParse({
          profession: "Pharmacist",
          ...DOCS,
          ...extra,
        }).success,
      ).toBe(false);
    }
  });
});
