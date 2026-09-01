import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isVerifiedProfessional } from "@/lib/auth/professional-verification";
import { canFacilityAccessApplication } from "@/lib/applications/ownership";

const CUT = [
  "Messages",
  "Availability",
  "Talent Pool",
  "Talent pool",
  "Matching",
  "Matching workflow",
  "Marketplace",
  "CPD",
  "Invite",
  "Billing",
  "AI: Find best candidate match",
  "Invite a teammate",
];

describe("MVP navigation and security invariants", () => {
  it("primary navigation no longer exposes cut fake modules", () => {
    const sidebar = readFileSync("src/components/app/sidebar.tsx", "utf8");
    const palette = readFileSync("src/components/app/command-palette.tsx", "utf8");
    const topbar = readFileSync("src/components/app/topbar.tsx", "utf8");
    for (const label of CUT) {
      expect(sidebar, label).not.toContain(`label: "${label}"`);
      expect(palette, label).not.toContain(`label: "${label}"`);
    }
    expect(sidebar).toContain('label: "Browse Jobs"');
    expect(sidebar).toContain('label: "My Applications"');
    expect(sidebar).toContain('label: "Documents"');
    expect(sidebar).toContain('label: "Applicants"');
    expect(sidebar).toContain('label: "Emergency"');
    expect(sidebar).toContain('label: "Verification"');
    expect(sidebar).toContain('label: "Facilities"');
    expect(sidebar).toContain('href: "/admin/emergency"');
    expect(topbar).not.toContain("Billing");
    expect(topbar).not.toContain("Invite team");
  });

  it("does not hardcode fake notification or applicant badges in the sidebar", () => {
    const source = readFileSync("src/components/app/sidebar.tsx", "utf8");
    expect(source).not.toMatch(/badge:\s*"3"/);
    expect(source).not.toMatch(/badge:\s*"5"/);
    expect(source).not.toMatch(/badge:\s*"12"/);
    expect(source).not.toMatch(/badge:\s*"PRO"/);
  });

  it("FACILITY_A_CAN_CLOSE_FACILITY_B_JOB=false", () => {
    const source = readFileSync("src/lib/repos/jobs.ts", "utf8");
    const start = source.indexOf("export async function closeJobForFacility");
    const end = source.indexOf("export async function getSavedJobsForUser");
    const slice = source.slice(start, end);
    expect(slice).toContain("eq(jobs.facilityId, facilityId)");
    expect(slice).toContain("eq(jobs.id, jobId)");
  });

  it("FACILITY_A_CAN_CHANGE_APPLICATION_FOR_FACILITY_B=false", () => {
    const source = readFileSync("src/app/(app)/applications/actions.ts", "utf8");
    expect(source).toContain("applicationBelongsToFacility");
    expect(source).toContain('requireRole(["facility", "admin"])');
    expect(source).toContain("canTransitionApplicationStatus");
    expect(
      canFacilityAccessApplication({
        actor: { role: "facility", facilityId: "fac-a" },
        jobFacilityId: "fac-b",
      }),
    ).toBe(false);
  });

  it("UNVERIFIED_PROFESSIONAL_CAN_ACCEPT_EMERGENCY=false", () => {
    expect(
      isVerifiedProfessional({ role: "professional", verified: false }),
    ).toBe(false);
    const source = readFileSync(
      "src/app/(app)/professional/dashboard/actions.ts",
      "utf8",
    );
    expect(source).toContain("requireVerifiedProfessional");
  });

  it("NON_ADMIN_CAN_ACCESS_ADMIN_VERIFICATION_DETAIL=false", () => {
    const source = readFileSync(
      "src/app/(app)/admin/verification/[id]/page.tsx",
      "utf8",
    );
    expect(source).toContain('requireRole(["admin"])');
    expect(source.indexOf("requireRole")).toBeLessThan(source.indexOf("getVerification"));
  });

  it("NON_ADMIN_CAN_MANUALLY_VERIFY=false", () => {
    const source = readFileSync(
      "src/app/api/admin/verifications/[verificationId]/decision/route.ts",
      "utf8",
    );
    expect(source).toContain('requireRole(["admin"])');
    expect(source).toContain("applyAdminVerificationDecision");
    expect(source.indexOf("requireRole")).toBeLessThan(
      source.indexOf("applyAdminVerificationDecision"),
    );
  });

  it("CLIENT_CAN_READ_PRACTITIONER_REGISTRY=false", () => {
    const migration = readFileSync(
      "supabase/migrations/0006_practitioner_registry.sql",
      "utf8",
    );
    expect(migration).toContain(
      "alter table public.practitioner_registry enable row level security",
    );
    expect(migration).toContain("Intentionally no policies");
    const repo = readFileSync("src/lib/repos/practitioner-registry.ts", "utf8");
    expect(repo).toContain('import "server-only"');
    expect(repo).toContain("getRegistryByIdForAdmin");
  });

  it("shows used-or-expired verification guidance without claiming success", () => {
    const source = readFileSync("src/app/(marketing)/login/page.tsx", "utf8");
    expect(source).toContain('error === "link_used_or_expired"');
    expect(source).toContain(
      "This verification link has already been used or has expired. If you",
    );
    expect(source).not.toContain("confirmation definitely succeeded");
  });

  it("professional application detail is owned and not-found for others", () => {
    const source = readFileSync(
      "src/app/(app)/professional/applications/[id]/page.tsx",
      "utf8",
    );
    expect(source).toContain('requireRole(["professional"])');
    expect(source).toContain("getApplicationForProfessional");
    expect(source).toContain("notFound()");
  });

  it("CLIENT_CAN_READ_LEGACY_HPA_TABLES=false", () => {
    const migration = readFileSync(
      "supabase/migrations/0008_lock_legacy_hpa_tables.sql",
      "utf8",
    );
    expect(migration).toContain(
      "drop policy if exists hpa_practitioners_read_all",
    );
    expect(migration).toContain("drop policy if exists hpa_premises_read_all");
  });

  it("public marketing homepage does not advertise cut or demo features", () => {
    const source = readFileSync("src/app/(marketing)/page.tsx", "utf8");
    expect(source).not.toContain("Marketplace");
    expect(source).not.toContain("CPD");
    expect(source).not.toContain("10,000+");
    expect(source).not.toContain("10k+");
    expect(source).not.toContain("SOC 2");
    expect(source).not.toContain("href=\"#\"");
    expect(source).not.toContain("Upcoming Interviews");
    expect(source).toContain("Join as Professional");
    expect(source).toContain("/privacy");
    expect(source).toContain("/terms");
  });

  it("public login does not offer Google until redirect URI is verified", () => {
    const login = readFileSync("src/app/(marketing)/login/page.tsx", "utf8");
    const signup = readFileSync("src/app/(marketing)/signup/page.tsx", "utf8");
    const route = readFileSync("src/app/api/auth/google/route.ts", "utf8");
    expect(login).toContain("GOOGLE_SIGNIN_PUBLIC");
    expect(signup).toContain("GOOGLE_SIGNIN_PUBLIC");
    expect(route).toContain("if (!GOOGLE_SIGNIN_PUBLIC)");
  });

  it("facility dashboard does not display a rating", () => {
    const source = readFileSync(
      "src/app/(app)/facility/dashboard/page.tsx",
      "utf8",
    );
    expect(source).not.toContain("rating");
    expect(source).not.toContain("Star");
  });

  it("post-MVP demo routes are hidden", () => {
    const files = [
      "src/app/(app)/professional/messages/page.tsx",
      "src/app/(app)/facility/messages/page.tsx",
      "src/app/(app)/professional/availability/page.tsx",
      "src/app/(app)/facility/talent/page.tsx",
      "src/app/(app)/admin/matching/page.tsx",
      "src/app/(app)/professional/marketplace/page.tsx",
      "src/app/(app)/facility/marketplace/page.tsx",
      "src/app/(app)/admin/marketplace/page.tsx",
      "src/app/(app)/professional/cpd/page.tsx",
      "src/app/(app)/facility/cpd/page.tsx",
      "src/app/(app)/admin/cpd/page.tsx",
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).toContain("mvpSurfaceUnavailable");
    }
  });
});
