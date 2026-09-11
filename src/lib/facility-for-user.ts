import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import type { FacilityCapability } from "@/lib/auth/facility-capabilities";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import type { AccountMembership, ActiveWorkspace } from "@/lib/auth/workspace-model";
import { getFacility } from "@/lib/repos/facilities";
import type { Facility, User } from "@/lib/types";

export type ActiveFacilityContext = {
  facilityId: string;
  membership: AccountMembership;
  workspace: Extract<ActiveWorkspace, { type: "facility" }>;
};

/**
 * Active facility workspace for viewing or mutating.
 * Cookie is not authorization: membership is re-checked.
 * Does NOT fall back to the first owned facility.
 * Does NOT use users.facility_id for non-admin product access.
 * Professional active workspaces return null — mutations must fail.
 */
export async function requireActiveFacilityWorkspace(
  user: User,
): Promise<ActiveFacilityContext | null> {
  return getActiveFacilityContext(user);
}

export async function getActiveFacilityContext(
  user: User,
): Promise<ActiveFacilityContext | null> {
  if (user.role === "admin") return null;
  const { workspace, memberships } = await resolveWorkspaceForUser(user);
  if (workspace?.type !== "facility") return null;
  const membership = memberships.find(
    (item) =>
      item.profileType === "facility" &&
      item.status === "active" &&
      item.facilityId === workspace.facilityId,
  );
  if (!membership?.facilityId) return null;
  return {
    facilityId: membership.facilityId,
    membership,
    workspace,
  };
}

export async function requireFacilityCapability(
  user: User,
  capability: FacilityCapability,
): Promise<ActiveFacilityContext | null> {
  const context = await getActiveFacilityContext(user);
  if (!context) return null;
  if (!hasFacilityCapability(context.membership.membershipRole, capability)) {
    return null;
  }
  return context;
}

/** Active facility workspace id. Null when operating as professional. */
export async function resolveActiveFacilityIdForUser(
  user: User,
): Promise<string | null> {
  const context = await getActiveFacilityContext(user);
  return context?.facilityId ?? null;
}

/**
 * @deprecated Use getActiveFacilityContext / requireFacilityCapability.
 * Kept as an alias of the active workspace facility id. No first-facility fallback.
 */
export async function resolveFacilityIdForUser(user: User): Promise<string | null> {
  return resolveActiveFacilityIdForUser(user);
}

export async function resolveFacilityForUser(user: User): Promise<Facility | null> {
  const facilityId = await resolveActiveFacilityIdForUser(user);
  if (!facilityId) return null;
  return getFacility(facilityId);
}
