import type { Role } from "@/lib/types";

export const WORKSPACE_COOKIE_NAME = "wanzwei_workspace";

export type MembershipProfileType = "professional" | "facility";

export type FacilityMembershipRole = "owner" | "admin" | "recruiter" | "viewer";

export type MembershipStatus = "active" | "revoked";

export type AccountMembership = {
  id: string;
  userId: string;
  profileType: MembershipProfileType;
  professionalProfileId: string | null;
  facilityId: string | null;
  facilityName?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  membershipRole: FacilityMembershipRole;
  status: MembershipStatus;
};

export type WorkspacePreference =
  | { type: "professional" }
  | { type: "facility"; facilityId: string };

export type ActiveWorkspace =
  | {
      type: "professional";
      professionalProfileId: string;
    }
  | {
      type: "facility";
      facilityId: string;
      membershipRole: FacilityMembershipRole;
      facilityName?: string | null;
    };

const FACILITY_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseWorkspaceCookie(
  raw: string | null | undefined,
): WorkspacePreference | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value === "professional") return { type: "professional" };
  if (value.startsWith("facility:")) {
    const facilityId = value.slice("facility:".length).trim();
    if (!FACILITY_ID_RE.test(facilityId)) return null;
    return { type: "facility", facilityId };
  }
  return null;
}

export function serializeWorkspaceCookie(preference: WorkspacePreference): string {
  if (preference.type === "professional") return "professional";
  return `facility:${preference.facilityId}`;
}

export function isActiveMembership(
  membership: Pick<AccountMembership, "status">,
): boolean {
  return membership.status === "active";
}

export function canMutateFacilityWorkspace(
  membership: Pick<AccountMembership, "status" | "membershipRole" | "profileType">,
): boolean {
  if (!isActiveMembership(membership)) return false;
  if (membership.profileType !== "facility") return false;
  return (
    membership.membershipRole === "owner" || membership.membershipRole === "admin"
  );
}

export function professionalMemberships(
  memberships: AccountMembership[],
): AccountMembership[] {
  return memberships.filter(
    (membership) =>
      membership.profileType === "professional" && isActiveMembership(membership),
  );
}

export function facilityMemberships(
  memberships: AccountMembership[],
): AccountMembership[] {
  return memberships.filter(
    (membership) =>
      membership.profileType === "facility" && isActiveMembership(membership),
  );
}

export function hasActiveProfessionalMembership(
  memberships: AccountMembership[],
): boolean {
  return professionalMemberships(memberships).length > 0;
}

export function hasActiveFacilityMembership(
  memberships: AccountMembership[],
  facilityId: string,
): boolean {
  return facilityMemberships(memberships).some(
    (membership) => membership.facilityId === facilityId,
  );
}

/**
 * Resolve the active workspace from a *preference* plus authoritative
 * memberships. The preference is never authorization: a tampered cookie,
 * revoked membership, or unknown facility id yields no access.
 */
export function resolveActiveWorkspace(input: {
  preference: WorkspacePreference | null;
  memberships: AccountMembership[];
  signupRole: Role;
  userId: string;
}): {
  workspace: ActiveWorkspace | null;
  rejectedTamperedPreference: boolean;
} {
  const professional = professionalMemberships(input.memberships)[0];
  const facilities = facilityMemberships(input.memberships);

  if (input.preference?.type === "professional") {
    if (professional) {
      return {
        workspace: {
          type: "professional",
          professionalProfileId: professional.professionalProfileId ?? input.userId,
        },
        rejectedTamperedPreference: false,
      };
    }
    return { workspace: defaultWorkspace(input), rejectedTamperedPreference: true };
  }

  if (input.preference?.type === "facility") {
    const wantedFacilityId = input.preference.facilityId;
    const match = facilities.find(
      (membership) => membership.facilityId === wantedFacilityId,
    );
    if (match?.facilityId) {
      return {
        workspace: {
          type: "facility",
          facilityId: match.facilityId,
          membershipRole: match.membershipRole,
          facilityName: match.facilityName,
        },
        rejectedTamperedPreference: false,
      };
    }
    return { workspace: defaultWorkspace(input), rejectedTamperedPreference: true };
  }

  return { workspace: defaultWorkspace(input), rejectedTamperedPreference: false };
}

function defaultWorkspace(input: {
  memberships: AccountMembership[];
  signupRole: Role;
  userId: string;
}): ActiveWorkspace | null {
  const professional = professionalMemberships(input.memberships)[0];
  const facilities = facilityMemberships(input.memberships);

  if (input.signupRole === "admin") return null;

  if (professional) {
    return {
      type: "professional",
      professionalProfileId: professional.professionalProfileId ?? input.userId,
    };
  }
  const first = facilities[0];
  if (first?.facilityId) {
    return {
      type: "facility",
      facilityId: first.facilityId,
      membershipRole: first.membershipRole,
      facilityName: first.facilityName,
    };
  }
  return null;
}

export function dashboardPathForWorkspace(
  workspace: ActiveWorkspace | null,
  signupRole: Role,
): string {
  if (signupRole === "admin") return "/admin/dashboard";
  if (workspace?.type === "facility") return "/facility/dashboard";
  if (workspace?.type === "professional") return "/professional/dashboard";
  if (signupRole === "facility") return "/facility/dashboard";
  return "/professional/dashboard";
}

export function switcherProfiles(input: {
  userId: string;
  userName: string;
  memberships: AccountMembership[];
}): Array<{
  key: string;
  type: MembershipProfileType;
  label: string;
  subtitle: string;
  facilityId?: string;
}> {
  const items: Array<{
    key: string;
    type: MembershipProfileType;
    label: string;
    subtitle: string;
    facilityId?: string;
  }> = [];

  if (hasActiveProfessionalMembership(input.memberships)) {
    items.push({
      key: "professional",
      type: "professional",
      label: input.userName,
      subtitle: "Professional",
    });
  }

  for (const membership of facilityMemberships(input.memberships)) {
    if (!membership.facilityId) continue;
    const roleLabel =
      membership.membershipRole.charAt(0).toUpperCase() +
      membership.membershipRole.slice(1);
    items.push({
      key: `facility:${membership.facilityId}`,
      type: "facility",
      label: membership.facilityName?.trim() || "Facility",
      subtitle: `Facility · ${roleLabel}`,
      facilityId: membership.facilityId,
    });
  }

  return items;
}

export function productRolesFromMemberships(
  signupRole: Role,
  memberships: AccountMembership[],
): Role[] {
  if (signupRole === "admin") return ["admin"];
  const roles = new Set<Role>();
  if (signupRole === "professional" || hasActiveProfessionalMembership(memberships)) {
    roles.add("professional");
  }
  if (signupRole === "facility" || facilityMemberships(memberships).length > 0) {
    roles.add("facility");
  }
  return [...roles];
}

export function userCanAccessRole(
  signupRole: Role,
  allowed: Role[],
  memberships: AccountMembership[],
): boolean {
  if (allowed.includes(signupRole)) return true;
  if (signupRole === "admin") return false;
  const product = productRolesFromMemberships(signupRole, memberships);
  return allowed.some((role) => product.includes(role));
}
