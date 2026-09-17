import type { FacilityMembershipRole } from "@/lib/auth/workspace-model";

/**
 * Facility membership is workspace authorization, not employment.
 * These flags are the only place product code should encode role rights.
 */
export type FacilityCapability =
  | "viewFacility"
  | "manageJobs"
  | "manageApplicants"
  | "manageEmergency"
  | "manageMarketplace"
  | "manageMembers"
  | "manageFacilitySettings"
  | "manageVerification"
  | "viewProfessionalNetwork"
  | "manageProfessionalNetwork"
  | "createRecruitmentBroadcast";

export type FacilityCapabilityMap = Record<FacilityCapability, boolean>;

const OWNER_ADMIN: FacilityCapabilityMap = {
  viewFacility: true,
  manageJobs: true,
  manageApplicants: true,
  manageEmergency: true,
  manageMarketplace: true,
  manageMembers: true,
  manageFacilitySettings: true,
  manageVerification: true,
  viewProfessionalNetwork: true,
  manageProfessionalNetwork: true,
  createRecruitmentBroadcast: true,
};

const RECRUITER: FacilityCapabilityMap = {
  viewFacility: true,
  manageJobs: true,
  manageApplicants: true,
  manageEmergency: false,
  manageMarketplace: false,
  manageMembers: false,
  manageFacilitySettings: false,
  manageVerification: false,
  viewProfessionalNetwork: true,
  manageProfessionalNetwork: false,
  createRecruitmentBroadcast: true,
};

const VIEWER: FacilityCapabilityMap = {
  viewFacility: true,
  manageJobs: false,
  manageApplicants: false,
  manageEmergency: false,
  manageMarketplace: false,
  manageMembers: false,
  manageFacilitySettings: false,
  manageVerification: false,
  viewProfessionalNetwork: true,
  manageProfessionalNetwork: false,
  createRecruitmentBroadcast: false,
};

export function facilityCapabilities(
  role: FacilityMembershipRole,
): FacilityCapabilityMap {
  if (role === "owner" || role === "admin") return OWNER_ADMIN;
  if (role === "recruiter") return RECRUITER;
  return VIEWER;
}

export function hasFacilityCapability(
  role: FacilityMembershipRole | null | undefined,
  capability: FacilityCapability,
): boolean {
  if (!role) return false;
  return facilityCapabilities(role)[capability];
}

export function canManageMembers(
  role: FacilityMembershipRole | null | undefined,
): boolean {
  return hasFacilityCapability(role, "manageMembers");
}

export function inviteableMembershipRoles(): FacilityMembershipRole[] {
  return ["owner", "admin", "recruiter", "viewer"];
}
