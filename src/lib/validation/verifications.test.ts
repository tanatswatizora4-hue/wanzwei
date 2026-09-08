import { describe, expect, it } from "vitest";

import { SubmitVerificationSchema } from "./verifications";

const DOCS = {
  identityDocumentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  credentialDocumentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};

describe("SubmitVerificationSchema", () => {
  it("accepts PCZ credentials and identity/credential document ids", () => {
    expect(
      SubmitVerificationSchema.parse({
        registeringBody: "PCZ",
        registrationNumber: "P01-6420-2026",
        profession: "Pharmacist",
        ...DOCS,
      }),
    ).toEqual({
      registeringBody: "PCZ",
      registrationNumber: "P01-6420-2026",
      profession: "Pharmacist",
      ...DOCS,
    });
  });

  it("accepts spaced, compact, lowercase, and padded HPA-format numbers", () => {
    for (const registrationNumber of [
      "P01-6420-2026",
      "P01 6420 2026",
      "P0164202026",
      "  p01-6420-2026  ",
      "p0164202026",
    ]) {
      expect(
        SubmitVerificationSchema.parse({
          registeringBody: "PCZ",
          registrationNumber,
          profession: "Pharmacist",
          ...DOCS,
        }).registrationNumber,
      ).toBe("P01-6420-2026");
    }
  });

  it("accepts a non-HPA registration number for a non-register council", () => {
    expect(
      SubmitVerificationSchema.parse({
        profession: "Physiotherapist",
        registeringBody: "AHPCZ",
        registrationNumber: "AH-4411",
        ...DOCS,
      }).registrationNumber,
    ).toBe("AH-4411");
  });

  it("rejects an empty registration number", () => {
    expect(
      SubmitVerificationSchema.safeParse({
        registeringBody: "PCZ",
        profession: "Pharmacist",
        ...DOCS,
      }).success,
    ).toBe(false);
  });

  it("rejects HPA as a selectable registering body", () => {
    expect(
      SubmitVerificationSchema.safeParse({
        registeringBody: "HPA",
        registrationNumber: "P01-6420-2026",
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
          registeringBody: "PCZ",
          registrationNumber: "P01-6420-2026",
          ...DOCS,
          ...extra,
        }).success,
      ).toBe(false);
    }
  });
});
