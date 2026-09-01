import { describe, expect, it } from "vitest";

import {
  assertNoProtectedSettingsFields,
  SettingsProfileUpdateSchema,
} from "./profile";

describe("SettingsProfileUpdateSchema", () => {
  it("accepts professional name and location", () => {
    expect(
      SettingsProfileUpdateSchema.parse({
        name: "Tinashe Moyo",
        location: "Harare",
      }),
    ).toEqual({
      name: "Tinashe Moyo",
      location: "Harare",
    });
  });

  it("rejects role, verified, facility_id, and HPA fields", () => {
    for (const extra of [
      { role: "admin" },
      { verified: true },
      { facilityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      { registrationNumber: "N123" },
      { registeringBody: "Nurses Council of Zimbabwe" },
      { profession: "Nurse" },
    ]) {
      expect(
        SettingsProfileUpdateSchema.safeParse({
          name: "Tinashe Moyo",
          ...extra,
        }).success,
      ).toBe(false);
    }
  });
});

describe("assertNoProtectedSettingsFields", () => {
  it("allows an empty payload", () => {
    expect(assertNoProtectedSettingsFields({})).toBe(true);
  });

  it("rejects protected keys when present", () => {
    expect(assertNoProtectedSettingsFields({ role: "admin" })).toBe(false);
    expect(assertNoProtectedSettingsFields({ verified: "true" })).toBe(false);
    expect(
      assertNoProtectedSettingsFields({
        facility_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).toBe(false);
    expect(
      assertNoProtectedSettingsFields({ registrationNumber: "N123" }),
    ).toBe(false);
  });
});
