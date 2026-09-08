import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SignupSchema } from "@/lib/validation/auth";
import { SettingsProfileUpdateSchema } from "@/lib/validation/profile";
import { SubmitVerificationSchema } from "@/lib/validation/verifications";
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
      SubmitVerificationSchema.safeParse({
        profession: "Pharmacist",
        registeringBody: "PCZ",
        identityDocumentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        credentialDocumentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        registrationNumber: "P01-6420-2026",
        verified: true,
        decision: "verified",
        confidence: 0.99,
        registry_match: true,
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
    expect(source.slice(start, end)).toContain("premisesNumber");
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

  it("FACILITY_CANNOT_READ_PROFESSIONAL_VERIFICATION_DOCUMENTS=true", () => {
    const source = readFileSync(
      "supabase/migrations/0005_rls_gap_hardening.sql",
      "utf8",
    ).replaceAll("\r\n", "\n");
    const start = source.indexOf(
      "-- professional_documents\n-- ---------------------------------------------------------------------",
    );
    const end = source.indexOf(
      "-- facility_verification_documents\n-- ---------------------------------------------------------------------",
    );
    const policy = source.slice(start, end);
    expect(policy).toContain("app_user_is_professional()");
    expect(policy).toContain("app_user_is_admin()");
    expect(policy).not.toContain("app_user_is_facility()");
    const facilityApps = readFileSync(
      "src/app/(app)/facility/applications/[id]/page.tsx",
      "utf8",
    );
    expect(facilityApps).not.toContain("professional_documents");
    const evidence = readFileSync(
      "supabase/migrations/0012_hybrid_verification_evidence.sql",
      "utf8",
    );
    expect(evidence).toContain("Intentionally no policies");
    const council = readFileSync(
      "supabase/migrations/0013_council_aware_verification.sql",
      "utf8",
    );
    expect(council).toContain("Does not change users.verified");
    expect(council).not.toMatch(/update public\.users\s+set verified/i);
  });
});
