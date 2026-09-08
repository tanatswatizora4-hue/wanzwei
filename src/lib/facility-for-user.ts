import { canMutateFacilityWorkspace } from "@/lib/auth/workspace-model";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { getFacility } from "@/lib/repos/facilities";
import type { Facility, User } from "@/lib/types";

/**
 * Active facility workspace for viewing. Preference cookie is not
 * authorization: membership is re-checked. Does not use email/name.
 */
export async function resolveActiveFacilityIdForUser(
  user: User,
): Promise<string | null> {
  if (user.role === "admin") return user.facilityId ?? null;
  const { workspace, memberships } = await resolveWorkspaceForUser(user);
  if (workspace?.type === "facility") {
    const ok = memberships.some(
      (item) =>
        item.profileType === "facility" &&
        item.status === "active" &&
        item.facilityId === workspace.facilityId,
    );
    return ok ? workspace.facilityId : null;
  }
  const first = memberships.find(
    (item) =>
      item.profileType === "facility" &&
      item.status === "active" &&
      item.facilityId,
  );
  return first?.facilityId ?? null;
}

/**
 * Facility id the caller may mutate (owner/admin). Preference is not auth.
 */
export async function resolveFacilityIdForUser(user: User): Promise<string | null> {
  if (user.role === "admin") return user.facilityId ?? null;
  const { workspace, memberships } = await resolveWorkspaceForUser(user);
  if (workspace?.type === "facility") {
    const membership = memberships.find(
      (item) =>
        item.profileType === "facility" &&
        item.facilityId === workspace.facilityId &&
        canMutateFacilityWorkspace(item),
    );
    return membership?.facilityId ?? null;
  }
  const owned = memberships.find(
    (item) =>
      item.profileType === "facility" &&
      item.status === "active" &&
      canMutateFacilityWorkspace(item) &&
      item.facilityId,
  );
  return owned?.facilityId ?? null;
}

export async function resolveFacilityForUser(user: User): Promise<Facility | null> {
  const facilityId = await resolveActiveFacilityIdForUser(user);
  if (!facilityId) return null;
  return getFacility(facilityId);
}
