import { describe, expect, it } from "vitest";

import {
  readSignupPayload,
  signupFieldFlags,
} from "@/lib/auth/signup-payload";
import { SignupSchema } from "@/lib/validation/auth";

describe("signup payload", () => {
  it("reads FormData fields by expected names", () => {
    const formData = new FormData();
    formData.set("name", "Tinashe Moyo");
    formData.set("email", "pro@example.com");
    formData.set("password", "secret1");
    formData.set("role", "facility");

    expect(readSignupPayload(formData)).toEqual({
      name: "Tinashe Moyo",
      email: "pro@example.com",
      password: "secret1",
      role: "facility",
      organisationName: undefined,
      location: undefined,
      facilityType: undefined,
      profession: undefined,
      premisesNumber: undefined,
    });
  });

  it("defaults role to professional when FormData omits role", () => {
    const formData = new FormData();
    formData.set("name", "Tinashe Moyo");
    formData.set("email", "pro@example.com");
    formData.set("password", "secret1");
    formData.set("profession", "Pharmacist");

    const payload = readSignupPayload(formData);
    const parsed = SignupSchema.parse(payload);

    expect(parsed.role).toBe("professional");
  });

  it("defaults role to professional when FormData role is empty", () => {
    const formData = new FormData();
    formData.set("name", "Tinashe Moyo");
    formData.set("email", "pro@example.com");
    formData.set("password", "secret1");
    formData.set("role", "   ");
    formData.set("profession", "Nurse");

    const payload = readSignupPayload(formData);
    const parsed = SignupSchema.parse(payload);

    expect(parsed.role).toBe("professional");
  });

  it("reports field presence flags without password values", () => {
    const formData = new FormData();
    formData.set("name", "Tinashe Moyo");
    formData.set("email", "pro@example.com");
    formData.set("password", "secret1");
    formData.set("role", "professional");

    const flags = signupFieldFlags(readSignupPayload(formData));

    expect(flags).toEqual({
      hasName: true,
      hasEmail: true,
      hasPassword: true,
      hasOrganisationName: false,
      hasLocation: false,
      hasFacilityType: false,
      hasProfession: false,
      hasPremisesNumber: false,
      role: "professional",
    });
    expect(flags).not.toHaveProperty("password");
  });

  it("reads facility organisation fields when present", () => {
    const formData = new FormData();
    formData.set("name", "Chipo Ncube");
    formData.set("email", "facility@example.com");
    formData.set("password", "secret1");
    formData.set("role", "facility");
    formData.set("organisationName", "Cure Hospital");
    formData.set("location", "Harare");
    formData.set("facilityType", "Hospital");
    formData.set("premisesNumber", "W01-2026-1234");

    const payload = readSignupPayload(formData);
    expect(payload).toMatchObject({
      organisationName: "Cure Hospital",
      location: "Harare",
      facilityType: "Hospital",
      premisesNumber: "W01-2026-1234",
      role: "facility",
    });
    expect(SignupSchema.parse(payload).premisesNumber).toBe("W01-2026-1234");
  });
});
