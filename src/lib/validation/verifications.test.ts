import { describe, expect, it } from "vitest";

import { SubmitVerificationSchema } from "./verifications";

describe("SubmitVerificationSchema", () => {
  it("accepts HPA credentials and normalizes the body", () => {
    expect(
      SubmitVerificationSchema.parse({
        registeringBody: "hpa",
        registrationNumber: "P01-6420-2026",
        profession: "Pharmacist",
      }),
    ).toEqual({
      registeringBody: "HPA",
      registrationNumber: "P01-6420-2026",
      profession: "Pharmacist",
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
        }).registrationNumber,
      ).toBe("P01-6420-2026");
    }
  });

  it("rejects a missing or invalid registration number", () => {
    expect(
      SubmitVerificationSchema.safeParse({
        registeringBody: "HPA",
        registrationNumber: "",
        profession: "Pharmacist",
      }).success,
    ).toBe(false);
    expect(
      SubmitVerificationSchema.safeParse({
        registeringBody: "HPA",
        registrationNumber: "not-a-licence",
        profession: "Pharmacist",
      }).success,
    ).toBe(false);
    expect(
      SubmitVerificationSchema.safeParse({
        registeringBody: "HPA",
        registrationNumber: "P01-642-2026",
        profession: "Pharmacist",
      }).success,
    ).toBe(false);
    expect(
      SubmitVerificationSchema.safeParse({
        registeringBody: "HPA",
        registrationNumber: "P01642026",
        profession: "Pharmacist",
      }).success,
    ).toBe(false);
  });

  it("strips a submitted userId so callers cannot target another user", () => {
    const parsed = SubmitVerificationSchema.parse({
      registeringBody: "HPA",
      registrationNumber: "P01-6420-2026",
      profession: "Pharmacist",
      userId: "22222222-2222-4222-8222-222222222222",
    });
    expect(parsed).not.toHaveProperty("userId");
  });
});
