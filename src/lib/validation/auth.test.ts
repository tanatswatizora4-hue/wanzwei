import { describe, expect, it } from "vitest";

import { LoginSchema, SignupSchema, CompletePasswordResetSchema } from "./auth";

describe("auth validation", () => {
  it("trims signup fields and defaults to professional role", () => {
    const parsed = SignupSchema.parse({
      name: "  Tinashe Moyo  ",
      email: "  pro@example.com  ",
      password: "secret1",
      profession: "Pharmacist",
      registeringBody: "PCZ",
    });

    expect(parsed).toEqual({
      name: "Tinashe Moyo",
      email: "pro@example.com",
      password: "secret1",
      role: "professional",
      profession: "Pharmacist",
      registeringBody: "PCZ",
    });
  });

  it("normalizes signup and login emails to lowercase", () => {
    expect(
      SignupSchema.parse({
        name: "Tinashe Moyo",
        email: "Pro@Example.com",
        password: "secret1",
        profession: "Pharmacist",
        registeringBody: "PCZ",
      }).email,
    ).toBe("pro@example.com");
    expect(
      LoginSchema.parse({
        email: "Pro@Example.com",
        password: "demo",
      }).email,
    ).toBe("pro@example.com");
  });

  it("defaults to professional when role is null (FormData missing value)", () => {
    const parsed = SignupSchema.parse({
      name: "Tinashe Moyo",
      email: "pro@example.com",
      password: "secret1",
      role: null,
      profession: "Nurse",
      registeringBody: "NCZ",
    });

    expect(parsed.role).toBe("professional");
  });

  it("rejects admin self-signup", () => {
    const parsed = SignupSchema.safeParse({
      name: "Platform Admin",
      email: "admin@example.com",
      password: "secret1",
      role: "admin",
    });

    expect(parsed.success).toBe(false);
  });

  it("requires organisation name, location, and type for facility signup", () => {
    expect(
      SignupSchema.safeParse({
        name: "Chipo Ncube",
        email: "facility@example.com",
        password: "secret1",
        role: "facility",
      }).success,
    ).toBe(false);

    const parsed = SignupSchema.parse({
      name: "Chipo Ncube",
      email: "facility@example.com",
      password: "secret1",
      role: "facility",
      organisationName: "Cure Hospital",
      location: "Harare",
      facilityType: "Hospital",
    });
    expect(parsed).toMatchObject({
      role: "facility",
      organisationName: "Cure Hospital",
      location: "Harare",
      facilityType: "Hospital",
    });
  });

  it("does not require facility fields for professional signup", () => {
    const parsed = SignupSchema.parse({
      name: "Tinashe Moyo",
      email: "pro@example.com",
      password: "secret1",
      role: "professional",
      profession: "Pharmacist",
      registeringBody: "PCZ",
    });
    expect(parsed.role).toBe("professional");
    expect(parsed.profession).toBe("Pharmacist");
    expect(parsed.registeringBody).toBe("PCZ");
  });

  it("requires a canonical profession for professional signup", () => {
    expect(
      SignupSchema.safeParse({
        name: "Tinashe Moyo",
        email: "pro@example.com",
        password: "secret1",
        role: "professional",
      }).success,
    ).toBe(false);
    expect(
      SignupSchema.safeParse({
        name: "Tinashe Moyo",
        email: "pro@example.com",
        password: "secret1",
        role: "professional",
        profession: "Doctor",
      }).success,
    ).toBe(false);
  });

  it("stores a premises number without treating it as facility verification", () => {
    const parsed = SignupSchema.parse({
      name: "Chipo Ncube",
      email: "facility@example.com",
      password: "secret1",
      role: "facility",
      organisationName: "Cure Hospital",
      location: "Harare",
      facilityType: "Hospital",
      premisesNumber: " w01-2026-0042 ",
      verified: true,
    });
    expect(parsed.premisesNumber).toBe("W01-2026-0042");
    expect(parsed).not.toHaveProperty("verified");
  });

  it("allows only same-origin relative login redirects", () => {
    expect(
      LoginSchema.safeParse({
        email: "pro@example.com",
        password: "demo",
        next: "/professional/dashboard",
      }).success,
    ).toBe(true);
    expect(
      LoginSchema.safeParse({
        email: "pro@example.com",
        password: "demo",
        next: "//evil.example/path",
      }).success,
    ).toBe(false);
    expect(
      LoginSchema.safeParse({
        email: "pro@example.com",
        password: "demo",
        next: "https://evil.example/path",
      }).success,
    ).toBe(false);
  });

  it("requires matching new and confirm passwords", () => {
    expect(
      CompletePasswordResetSchema.safeParse({
        password: "secret1",
        confirmPassword: "secret1",
      }).success,
    ).toBe(true);
    expect(
      CompletePasswordResetSchema.safeParse({
        password: "secret1",
        confirmPassword: "other12",
      }).success,
    ).toBe(false);
    expect(
      CompletePasswordResetSchema.safeParse({
        password: "123",
        confirmPassword: "123",
      }).success,
    ).toBe(false);
  });
});
