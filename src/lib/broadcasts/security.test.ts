import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { facilityCapabilities } from "@/lib/auth/facility-capabilities";
import { canCreateBroadcastType, canManageProfessionalNetwork } from "./access";
import { emptyTargetingCriteria } from "./criteria";
import { SendBroadcastSchema, TargetingCriteriaSchema } from "@/lib/validation/broadcasts";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("targeted workforce broadcast security", () => {
  it("Facility A cannot manage Facility B network", () => {
    const actions = read("src/app/(app)/facility/network/actions.ts");
    expect(actions).toContain("requireFacilityCapability(user, \"manageProfessionalNetwork\")");
    expect(actions).toContain("context.facilityId");
    expect(actions).not.toContain("formData.get(\"facilityId\")");
    expect(actions).not.toContain("formData.get(\"facility_id\")");
    const repo = read("src/lib/repos/facility-professional-network.ts");
    expect(repo).toContain("eq(facilityProfessionalNetwork.facilityId, input.facilityId)");
  });

  it("network membership does not create facility workspace authorization", () => {
    const actions = read("src/app/(app)/facility/network/actions.ts");
    expect(actions).not.toContain("insertFacilityMembership");
    expect(actions).not.toContain("account_memberships");
    expect(actions).not.toContain("updateUser(");
    const repo = read("src/lib/repos/facility-professional-network.ts");
    expect(repo).not.toContain("insertFacilityMembership");
    expect(repo).toContain("facilityProfessionalNetwork");
  });

  it("owner/admin can manage network; recruiter can view/use but not manage; viewer cannot mutate", () => {
    expect(canManageProfessionalNetwork("owner")).toBe(true);
    expect(canManageProfessionalNetwork("admin")).toBe(true);
    expect(canManageProfessionalNetwork("recruiter")).toBe(false);
    expect(canManageProfessionalNetwork("viewer")).toBe(false);
    expect(facilityCapabilities("recruiter").viewProfessionalNetwork).toBe(true);
    expect(facilityCapabilities("recruiter").createRecruitmentBroadcast).toBe(true);
    expect(facilityCapabilities("viewer").createRecruitmentBroadcast).toBe(false);
    expect(canCreateBroadcastType("recruiter", "locum")).toBe(true);
    expect(canCreateBroadcastType("recruiter", "emergency")).toBe(false);
    expect(canCreateBroadcastType("viewer", "locum")).toBe(false);
    const networkActions = read("src/app/(app)/facility/network/actions.ts");
    expect(networkActions).toContain("manageProfessionalNetwork");
    const broadcastActions = read("src/app/(app)/facility/broadcasts/actions.ts");
    expect(broadcastActions).toContain("capabilityForBroadcastType");
  });

  it("AI output is strict-schema validated and cannot send", () => {
    expect(
      TargetingCriteriaSchema.safeParse({
        ...emptyTargetingCriteria(),
        availability: "weekends",
      }).success,
    ).toBe(false);
    const interpret = read("src/lib/broadcasts/interpret.ts");
    expect(interpret).toContain("TargetingCriteriaSchema");
    expect(interpret).not.toContain("sendBroadcastAction");
    expect(interpret).not.toContain("insertWorkforceBroadcast");
    const actions = read("src/app/(app)/facility/broadcasts/actions.ts");
    expect(actions).toContain("interpretBroadcastTargetingAction");
    expect(actions.indexOf("export async function interpretBroadcastTargetingAction")).toBeLessThan(
      actions.indexOf("export async function sendBroadcastAction"),
    );
    const interpretFn = actions.slice(
      actions.indexOf("export async function interpretBroadcastTargetingAction"),
      actions.indexOf("export async function improveBroadcastCopyAction"),
    );
    expect(interpretFn).not.toContain("insertWorkforceBroadcast");
    expect(interpretFn).not.toContain("deliverWorkforceBroadcast");
    expect(interpretFn).not.toContain("createEmergencyAlert");
  });

  it("send recomputes recipient count server-side and snapshots recipients", () => {
    expect(
      SendBroadcastSchema.safeParse({
        type: "locum",
        title: "Weekend cover",
        message: "Need nurses",
        criteria: emptyTargetingCriteria(),
        matchedRecipientCount: 1,
        recipientIds: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      }).success,
    ).toBe(false);
    const actions = read("src/app/(app)/facility/broadcasts/actions.ts");
    expect(actions).toContain("matchProfessionals");
    expect(actions).toContain("recipientsForSend");
    expect(actions).toContain("insertBroadcastRecipients");
    expect(actions).toContain("matchedRecipientCount: count");
    expect(actions).not.toContain("formData.get(\"facilityId\")");
    expect(actions).not.toContain("input.facilityId");
    expect(actions).toContain("context.facilityId");
  });

  it("internal locum and private professional access stay recipient-gated", () => {
    const criteria = read("src/lib/broadcasts/criteria.ts");
    expect(criteria).toContain('type === "internal_locum" ? true : criteria.networkOnly');
    const detail = read("src/app/(app)/professional/opportunities/[id]/page.tsx");
    expect(detail).toContain("getBroadcastForProfessionalRecipient");
    expect(detail).toContain("notFound()");
    expect(detail).not.toContain("listBroadcastsForFacility");
    expect(detail).not.toContain("recipients");
    const list = read("src/app/(app)/professional/opportunities/page.tsx");
    expect(list).toContain("listBroadcastsForProfessional");
    expect(list).not.toContain("listBroadcastsForFacility");
  });

  it("active Professional workspace cannot send a facility broadcast", () => {
    const actions = read("src/app/(app)/facility/broadcasts/actions.ts");
    expect(actions).toContain("requireFacilityCapability");
    expect(actions).toContain("capabilityForBroadcastType");
    const layout = read("src/app/(app)/facility/layout.tsx");
    expect(layout).toContain('requireRole(["facility"])');
    expect(layout).toContain('workspace?.type !== "facility"');
  });

  it("keeps existing emergency rate-limit and job ownership checks", () => {
    const emergency = read("src/app/(app)/facility/emergency/actions.ts");
    expect(emergency).toContain('checkRateLimit("emergencyAlert", user.id)');
    expect(emergency).toContain('requireFacilityCapability(user, "manageEmergency")');
    const broadcasts = read("src/app/(app)/facility/broadcasts/actions.ts");
    expect(broadcasts).toContain('parsed.data.type === "emergency" ? "emergencyAlert" : "workforceBroadcast"');
    expect(broadcasts).toContain("getJobForFacility(parsed.data.jobId, context.facilityId)");
    expect(broadcasts).toContain("createEmergencyAlertForRecipientIds");
    const migration = read("supabase/migrations/0020_targeted_workforce_broadcasts.sql");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.facility_professional_network from anon, authenticated");
    expect(migration).toContain("revoke all on public.workforce_broadcasts from anon, authenticated");
    expect(migration).toContain("revoke all on public.workforce_broadcast_recipients from anon, authenticated");
    expect(migration).not.toContain("create policy");
    expect(migration).toContain("Does not change account_memberships, users.role, users.facility_id");
    expect(migration).not.toMatch(/alter table public\.account_memberships/i);
    expect(migration).not.toMatch(/alter table public\.users/i);
    expect(migration).not.toMatch(/update public\.users/i);
  });
});
