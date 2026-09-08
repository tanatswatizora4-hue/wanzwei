import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isVerifiedProfessional } from "@/lib/auth/professional-verification";
import { SettingsProfileUpdateSchema } from "@/lib/validation/profile";
import { SubmitVerificationSchema } from "@/lib/validation/verifications";

function read(path: string): string {
  return readFileSync(path, "utf8").replaceAll("\r\n", "\n");
}

const RLS_HELPERS = [
  "app_user_role()",
  "app_user_facility_id()",
  "app_user_is_admin()",
  "app_user_owns_facility(uuid)",
  "app_facility_owns_job(uuid)",
  "app_facility_owns_application(uuid)",
  "app_facility_owns_alert(uuid)",
  "app_alert_assigned_to_user(uuid)",
  "app_user_is_professional()",
  "app_user_is_facility()",
  "app_user_has_professional_membership()",
  "app_user_has_facility_membership(uuid)",
  "app_user_owns_listing(uuid)",
] as const;

const TRIGGER_ONLY = [
  "prevent_user_self_privilege_update()",
  "prevent_verification_self_review_update()",
  "prevent_alert_recipient_identity_update()",
  "prevent_facility_self_verify()",
  "set_updated_at()",
] as const;

describe("0017 database security hardening", () => {
  const hardening = read(
    "supabase/migrations/0017_database_security_hardening.sql",
  );
  const memberships = read("supabase/migrations/0014_account_memberships.sql");
  const listings = read(
    "supabase/migrations/0015_marketplace_classified_listings.sql",
  );
  const certificates = read("supabase/migrations/0016_cpd_certificates.sql");
  const evidence = read(
    "supabase/migrations/0012_hybrid_verification_evidence.sql",
  );
  const registry = read("supabase/migrations/0006_practitioner_registry.sql");
  const privilegeTrigger = read(
    "supabase/migrations/0013_council_aware_verification.sql",
  );
  const facilityVerify = read(
    "supabase/migrations/0007_facility_verified_privilege.sql",
  );

  it("revokes anon execute on SECURITY DEFINER helpers and keeps RLS helpers on authenticated", () => {
    for (const fn of RLS_HELPERS) {
      expect(hardening).toContain(
        `revoke all on function public.${fn} from public, anon`,
      );
      expect(hardening).toContain(
        `grant execute on function public.${fn} to authenticated`,
      );
      expect(hardening).not.toMatch(
        new RegExp(
          `grant execute on function public\\.${fn.replaceAll("(", "\\(").replaceAll(")", "\\)")} to anon`,
          "i",
        ),
      );
    }
  });

  it("does not grant client execute on trigger-only privilege-protection functions", () => {
    for (const fn of TRIGGER_ONLY) {
      expect(hardening).toContain(
        `revoke all on function public.${fn} from public, anon, authenticated`,
      );
      expect(hardening).not.toMatch(
        new RegExp(
          `grant execute on function public\\.${fn.replaceAll("(", "\\(").replaceAll(")", "\\)")} to (anon|authenticated)`,
          "i",
        ),
      );
    }
  });

  it("pins search_path on set_updated_at and SECURITY DEFINER helpers", () => {
    expect(hardening).toContain(
      "alter function public.set_updated_at()\n  set search_path = public, pg_temp",
    );
    for (const fn of [...RLS_HELPERS, ...TRIGGER_ONLY.filter((f) => f !== "set_updated_at()")]) {
      expect(hardening).toContain(
        `alter function public.${fn}\n  set search_path = public, pg_temp`,
      );
    }
    expect(hardening).not.toMatch(/security invoker/i);
  });

  it("adds covering indexes and does not create client policies on default-deny tables", () => {
    expect(hardening).toContain(
      "create index if not exists account_memberships_professional_profile_id_idx",
    );
    expect(hardening).toContain(
      "on public.account_memberships (professional_profile_id)",
    );
    expect(hardening).toContain("create index if not exists listing_images_owner_id_idx");
    expect(hardening).toContain("on public.listing_images (owner_id)");
    expect(hardening).not.toMatch(
      /create policy[\s\S]{0,200}on public\.(practitioner_registry|verification_events|verification_evidence)/i,
    );
    expect(hardening).not.toMatch(/disable row level security/i);
  });

  it("keeps client writes denied for memberships, listing images, and certificates", () => {
    expect(memberships).toContain("account_memberships_no_client_insert");
    expect(memberships).toContain("account_memberships_no_client_update");
    expect(memberships).toContain("with check (false)");
    expect(listings).toContain("listing_images_no_client_insert");
    expect(listings).toContain("listing_images_no_client_update");
    expect(listings).toContain("listing_images_no_client_delete");
    expect(certificates).toContain("cpd_certificates_no_client_insert");
    expect(certificates).toContain("cpd_certificates_no_client_update");
    expect(hardening).not.toMatch(
      /grant (insert|update|delete) on public\.(account_memberships|listing_images|cpd_certificates)/i,
    );
    expect(hardening).not.toContain("with check (true)");
  });

  it("keeps verification_evidence and practitioner_registry default-deny", () => {
    expect(evidence).toContain("Intentionally no policies");
    expect(evidence).toContain(
      "alter table public.verification_evidence enable row level security",
    );
    expect(registry).toContain(
      "alter table public.practitioner_registry enable row level security",
    );
    expect(registry).toContain("Intentionally no policies");
    expect(hardening).not.toMatch(
      /create policy[\s\S]{0,200}on public\.verification_evidence/i,
    );
    expect(hardening).not.toMatch(
      /create policy[\s\S]{0,200}on public\.practitioner_registry/i,
    );
  });

  it("keeps privileged-field and self-verify triggers intact", () => {
    expect(privilegeTrigger).toContain("prevent_user_self_privilege_update");
    expect(privilegeTrigger).toContain("new.verified is distinct from old.verified");
    expect(privilegeTrigger).toContain("new.role is distinct from old.role");
    expect(facilityVerify).toContain("prevent_facility_self_verify");
    expect(facilityVerify).toContain(
      "Only administrators may update facility verification",
    );
    expect(hardening).not.toContain("drop trigger");
    expect(hardening).not.toContain("create or replace function");
  });

  it("does not let professionals or facilities self-set verified", () => {
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
      }).success,
    ).toBe(false);
    expect(
      isVerifiedProfessional({ role: "professional", verified: false }),
    ).toBe(false);
  });

  it("keeps existing verified-only gates unchanged", () => {
    const jobs = read("src/app/(app)/professional/jobs/actions.ts");
    expect(jobs).toContain("requireVerifiedProfessional");
    expect(listings).toContain("u.verified = true");
    expect(hardening).toContain("u.verified = true");
    expect(hardening).toContain("user_id = (select auth.uid())");
    expect(hardening).toContain("owner_id = (select auth.uid())");
  });
});
