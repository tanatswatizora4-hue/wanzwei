import type { FacilityCapability } from "@/lib/auth/facility-capabilities";
import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import type { FacilityMembershipRole } from "@/lib/auth/workspace-model";
import type { BroadcastType } from "@/lib/broadcasts/network-types";

export function capabilityForBroadcastType(
  type: BroadcastType,
): FacilityCapability {
  if (type === "emergency") return "manageEmergency";
  return "createRecruitmentBroadcast";
}

export function canCreateBroadcastType(
  role: FacilityMembershipRole | null | undefined,
  type: BroadcastType,
): boolean {
  return hasFacilityCapability(role, capabilityForBroadcastType(type));
}

export function canPreviewBroadcastType(
  role: FacilityMembershipRole | null | undefined,
  type: BroadcastType,
): boolean {
  return canCreateBroadcastType(role, type);
}

export function canViewFacilityBroadcasts(
  role: FacilityMembershipRole | null | undefined,
): boolean {
  return hasFacilityCapability(role, "viewFacility");
}

export function canViewProfessionalNetwork(
  role: FacilityMembershipRole | null | undefined,
): boolean {
  return hasFacilityCapability(role, "viewProfessionalNetwork");
}

export function canManageProfessionalNetwork(
  role: FacilityMembershipRole | null | undefined,
): boolean {
  return hasFacilityCapability(role, "manageProfessionalNetwork");
}
