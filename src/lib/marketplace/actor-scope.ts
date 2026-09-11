import "server-only";

import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import type { User } from "@/lib/types";

export type MarketplaceActorScope = {
  activeWorkspaceType: "professional" | "facility" | "admin";
  /** Facility ids the actor may mutate listings for (active workspace only). */
  mutateFacilityIds: string[];
  /** Active facility id used to block self-enquiry / view own listings. */
  identityFacilityIds: string[];
};

/**
 * Marketplace scope follows the active workspace, not every membership.
 * Recruiter/viewer may identify with the facility (no self-enquiry) but
 * cannot mutate listings.
 */
export async function marketplaceActorScope(
  user: User,
): Promise<MarketplaceActorScope> {
  if (user.role === "admin") {
    return {
      activeWorkspaceType: "admin",
      mutateFacilityIds: [],
      identityFacilityIds: [],
    };
  }
  const { workspace } = await resolveWorkspaceForUser(user);
  if (workspace?.type === "facility") {
    const canMutate = hasFacilityCapability(
      workspace.membershipRole,
      "manageMarketplace",
    );
    return {
      activeWorkspaceType: "facility",
      mutateFacilityIds: canMutate ? [workspace.facilityId] : [],
      identityFacilityIds: [workspace.facilityId],
    };
  }
  return {
    activeWorkspaceType: "professional",
    mutateFacilityIds: [],
    identityFacilityIds: [],
  };
}
