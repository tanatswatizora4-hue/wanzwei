import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SignupSchema } from "@/lib/validation/auth";
import { SettingsProfileUpdateSchema } from "@/lib/validation/profile";
import { isVerifiedProfessional } from "@/lib/auth/professional-verification";
import { cancelOwnedEmergencyAlert } from "@/lib/emergency/cancel-owned-alert";

describe("Phase A security invariants", () => {
  it("PUBLIC_SIGNUP_CAN_CREATE_ADMIN=false", () => {
    expect(
      SignupSchema.safeParse({
        name: "Attacker",
        email: "admin@example.com",
        password: "secret1",
        role: "admin",
      }).success,
    ).toBe(false);
  });

  it("PROFESSIONAL_CAN_SET_VERIFIED=false", () => {
    expect(
      SettingsProfileUpdateSchema.safeParse({
        name: "Tinashe Moyo",
        verified: true,
      }).success,
    ).toBe(false);
    expect(
      isVerifiedProfessional({ role: "professional", verified: false }),
    ).toBe(false);
  });

  it("FACILITY_CAN_SET_FACILITY_VERIFIED=false", () => {
    expect(
      SettingsProfileUpdateSchema.safeParse({
        name: "Chipo Ncube",
        verified: true,
      }).success,
    ).toBe(false);
    const source = readFileSync("src/lib/repos/facilities.ts", "utf8");
    const start = source.indexOf(
      "export async function updateFacilityPublicProfile",
    );
    const end = source.indexOf("export async function provisionFacilityUser");
    expect(source.slice(start, end)).not.toMatch(/verified/);
  });

  it("USER_CAN_CHOOSE_FACILITY_ID=false", () => {
    expect(
      SettingsProfileUpdateSchema.safeParse({
        name: "Chipo Ncube",
        facilityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }).success,
    ).toBe(false);
  });

  it("FACILITY_A_CAN_CANCEL_FACILITY_B_ALERT=false", async () => {
    const result = await cancelOwnedEmergencyAlert(
      {
        role: "facility",
        facilityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      "alert-b",
      {
        cancelForFacility: async () => false,
      },
    );
    expect(result).toBe("not_found");
  });

  it("UNVERIFIED_PROFESSIONAL_CAN_APPLY=false", () => {
    expect(
      isVerifiedProfessional({ role: "professional", verified: false }),
    ).toBe(false);
    const source = readFileSync(
      "src/app/(app)/professional/jobs/actions.ts",
      "utf8",
    );
    expect(source).toContain("requireVerifiedProfessional");
  });
});
