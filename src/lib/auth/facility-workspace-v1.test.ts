import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { facilityCapabilities } from "./facility-capabilities";

describe("facility workspace authorization v1", () => {
  it("does not fall back to the first owned facility for mutations", () => {
    const source = readFileSync("src/lib/facility-for-user.ts", "utf8");
    expect(source).toContain("requireActiveFacilityWorkspace");
    expect(source).toContain("requireFacilityCapability");
    expect(source).toContain("Does NOT fall back to the first owned facility.");
    expect(source).not.toContain("canMutateFacilityWorkspace");
    expect(source).not.toContain("facilityMemberships(memberships)[0]");
  });

  it("jobs, applicants, emergency, marketplace, and settings use active-workspace capability", () => {
    expect(readFileSync("src/app/(app)/facility/jobs/actions.ts", "utf8")).toContain(
      'requireFacilityCapability(user, "manageJobs")',
    );
    expect(readFileSync("src/app/(app)/applications/actions.ts", "utf8")).toContain(
      'requireFacilityCapability(user, "manageApplicants")',
    );
    expect(
      readFileSync("src/app/(app)/facility/emergency/actions.ts", "utf8"),
    ).toContain('requireFacilityCapability(user, "manageEmergency")');
    expect(readFileSync("src/app/(app)/facility/broadcasts/actions.ts", "utf8")).toContain(
      "requireFacilityCapability",
    );
    expect(readFileSync("src/app/(app)/facility/network/actions.ts", "utf8")).toContain(
      'requireFacilityCapability(user, "manageProfessionalNetwork")',
    );
    expect(readFileSync("src/app/(app)/marketplace/actions.ts", "utf8")).toContain(
      'requireFacilityCapability(user, "manageMarketplace")',
    );
    expect(readFileSync("src/app/(app)/settings/actions.ts", "utf8")).toContain(
      "manageFacilitySettings",
    );
    expect(
      readFileSync("src/app/api/uploads/facility-verification/route.ts", "utf8"),
    ).toContain('requireFacilityCapability(user, "manageVerification")');
  });

  it("client cannot write account_memberships or facility_invitations", () => {
    const memberships = readFileSync(
      "supabase/migrations/0014_account_memberships.sql",
      "utf8",
    );
    expect(memberships).toContain("with check (false)");
    const invitations = readFileSync(
      "supabase/migrations/0018_facility_invitations.sql",
      "utf8",
    );
    expect(invitations).toContain("enable row level security");
    expect(invitations).toContain("revoke all on public.facility_invitations");
    expect(invitations).toContain("token_hash");
    expect(invitations).not.toContain("create policy");
    const fkIndexes = readFileSync(
      "supabase/migrations/0019_facility_invitation_fk_indexes.sql",
      "utf8",
    );
    expect(fkIndexes).toContain(
      "create index if not exists facility_invitations_invited_by_idx",
    );
    expect(fkIndexes).toContain(
      "create index if not exists facility_invitations_accepted_by_idx",
    );
  });

  it("member management is owner/admin only and protects the last owner", () => {
    const source = readFileSync(
      "src/app/(app)/facility/members/actions.ts",
      "utf8",
    );
    expect(source).toContain('requireFacilityCapability(user, "manageMembers")');
    expect(source).toContain("wouldLeaveZeroOwners");
    expect(source).toContain("evaluateInvitationAcceptance");
    expect(source).toContain("hashFacilityInvitationToken");
    expect(source).not.toContain("updateUser(");
  });

  it("switching and creating a facility does not rewrite users.role", () => {
    const source = readFileSync("src/app/(app)/workspace/actions.ts", "utf8");
    const switchFn = source.slice(
      source.indexOf("export async function switchWorkspaceAction"),
      source.indexOf("export async function createFacilityWorkspaceAction"),
    );
    expect(switchFn).not.toContain("role:");
    const create = source.slice(
      source.indexOf("export async function createFacilityWorkspaceAction"),
      source.indexOf("export async function createProfessionalWorkspaceAction"),
    );
    expect(create).toContain("persistWorkspacePreference");
    expect(create).not.toContain("role:");
  });

  it("profile switcher always offers create or join a facility", () => {
    const source = readFileSync("src/components/app/profile-switcher.tsx", "utf8");
    expect(source).toContain("Create or join a facility");
    expect(source).toContain("Add Professional profile");
    expect(source).not.toContain("profiles.length < 2");
  });
});

describe("workspace-aware navigation", () => {
  it("keeps professional navigation complete", () => {
    const sidebar = readFileSync("src/components/app/sidebar.tsx", "utf8");
    for (const label of [
      "Browse Jobs",
      "My Applications",
      "Saved Jobs",
      "Opportunities",
      "CPD",
      "Certificates",
      "Marketplace",
      "My Listings",
      "Documents",
      "Notifications",
    ]) {
      expect(sidebar).toContain(`label: "${label}"`);
    }
  });

  it("gates facility members and listings on capability", () => {
    const sidebar = readFileSync("src/components/app/sidebar.tsx", "utf8");
    expect(sidebar).toContain('label: "Members"');
    expect(sidebar).toContain('label: "Network"');
    expect(sidebar).toContain('label: "Broadcasts"');
    expect(sidebar).toContain("caps.manageMembers");
    expect(sidebar).toContain("caps.viewProfessionalNetwork");
    expect(sidebar).toContain("caps.createRecruitmentBroadcast");
    expect(sidebar).toContain("caps.manageMarketplace");
    expect(facilityCapabilities("recruiter").manageMembers).toBe(false);
    expect(facilityCapabilities("recruiter").manageMarketplace).toBe(false);
    expect(facilityCapabilities("viewer").manageJobs).toBe(false);
    expect(facilityCapabilities("owner").manageMembers).toBe(true);
  });
});
