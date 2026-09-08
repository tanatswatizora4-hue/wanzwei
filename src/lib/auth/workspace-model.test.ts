import { describe, expect, it } from "vitest";

import type { AccountMembership } from "./workspace-model";
import {
  dashboardPathForWorkspace,
  hasActiveFacilityMembership,
  parseWorkspaceCookie,
  productRolesFromMemberships,
  resolveActiveWorkspace,
  serializeWorkspaceCookie,
  switcherProfiles,
  userCanAccessRole,
} from "./workspace-model";

const USER = "11111111-1111-4111-8111-111111111111";
const FAC_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FAC_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function professional(): AccountMembership {
  return {
    id: "m-pro",
    userId: USER,
    profileType: "professional",
    professionalProfileId: USER,
    facilityId: null,
    membershipRole: "owner",
    status: "active",
  };
}

function facility(
  facilityId: string,
  name: string,
  status: AccountMembership["status"] = "active",
): AccountMembership {
  return {
    id: `m-${facilityId}`,
    userId: USER,
    profileType: "facility",
    professionalProfileId: null,
    facilityId,
    facilityName: name,
    membershipRole: "owner",
    status,
  };
}

describe("workspace cookie preference", () => {
  it("parses professional and facility cookies and rejects garbage", () => {
    expect(parseWorkspaceCookie("professional")).toEqual({ type: "professional" });
    expect(parseWorkspaceCookie(`facility:${FAC_A}`)).toEqual({
      type: "facility",
      facilityId: FAC_A,
    });
    expect(parseWorkspaceCookie("facility:not-a-uuid")).toBeNull();
    expect(parseWorkspaceCookie("admin")).toBeNull();
    expect(parseWorkspaceCookie("facility:")).toBeNull();
    expect(serializeWorkspaceCookie({ type: "professional" })).toBe("professional");
    expect(serializeWorkspaceCookie({ type: "facility", facilityId: FAC_A })).toBe(
      `facility:${FAC_A}`,
    );
  });
});

describe("resolveActiveWorkspace", () => {
  it("professional-only account stays on the professional workspace", () => {
    const result = resolveActiveWorkspace({
      preference: null,
      memberships: [professional()],
      signupRole: "professional",
      userId: USER,
    });
    expect(result.workspace).toEqual({
      type: "professional",
      professionalProfileId: USER,
    });
    expect(result.rejectedTamperedPreference).toBe(false);
  });

  it("facility-only legacy account uses the owned facility", () => {
    const result = resolveActiveWorkspace({
      preference: null,
      memberships: [facility(FAC_A, "Clinic A")],
      signupRole: "facility",
      userId: USER,
    });
    expect(result.workspace).toMatchObject({
      type: "facility",
      facilityId: FAC_A,
    });
  });

  it("switches professional → facility and facility → professional when membership exists", () => {
    const memberships = [professional(), facility(FAC_A, "Clinic A")];
    const toFacility = resolveActiveWorkspace({
      preference: { type: "facility", facilityId: FAC_A },
      memberships,
      signupRole: "professional",
      userId: USER,
    });
    expect(toFacility.workspace?.type).toBe("facility");
    const toProfessional = resolveActiveWorkspace({
      preference: { type: "professional" },
      memberships,
      signupRole: "facility",
      userId: USER,
    });
    expect(toProfessional.workspace?.type).toBe("professional");
  });

  it("rejects an arbitrary facility id and a revoked membership immediately", () => {
    const memberships = [professional(), facility(FAC_A, "Clinic A")];
    const arbitrary = resolveActiveWorkspace({
      preference: { type: "facility", facilityId: FAC_B },
      memberships,
      signupRole: "professional",
      userId: USER,
    });
    expect(arbitrary.rejectedTamperedPreference).toBe(true);
    expect(arbitrary.workspace?.type).toBe("professional");

    const revoked = resolveActiveWorkspace({
      preference: { type: "facility", facilityId: FAC_A },
      memberships: [professional(), facility(FAC_A, "Clinic A", "revoked")],
      signupRole: "professional",
      userId: USER,
    });
    expect(hasActiveFacilityMembership(memberships, FAC_B)).toBe(false);
    expect(revoked.rejectedTamperedPreference).toBe(true);
    expect(revoked.workspace?.type).toBe("professional");
  });

  it("supports multiple facility memberships without mixing them", () => {
    const memberships = [
      professional(),
      facility(FAC_A, "Clinic A"),
      facility(FAC_B, "Hospital B"),
    ];
    const a = resolveActiveWorkspace({
      preference: { type: "facility", facilityId: FAC_A },
      memberships,
      signupRole: "professional",
      userId: USER,
    });
    const b = resolveActiveWorkspace({
      preference: { type: "facility", facilityId: FAC_B },
      memberships,
      signupRole: "professional",
      userId: USER,
    });
    expect(a.workspace).toMatchObject({ type: "facility", facilityId: FAC_A });
    expect(b.workspace).toMatchObject({ type: "facility", facilityId: FAC_B });
  });

  it("does not treat admin as a workspace and keeps signup-role dashboards", () => {
    expect(
      resolveActiveWorkspace({
        preference: { type: "professional" },
        memberships: [],
        signupRole: "admin",
        userId: USER,
      }).workspace,
    ).toBeNull();
    expect(dashboardPathForWorkspace(null, "admin")).toBe("/admin/dashboard");
    expect(
      userCanAccessRole("admin", ["professional", "facility"], [professional()]),
    ).toBe(false);
    expect(userCanAccessRole("admin", ["admin"], [])).toBe(true);
  });

  it("omits admin from the switcher", () => {
    const profiles = switcherProfiles({
      userId: USER,
      userName: "Tanatswa Tizora",
      memberships: [professional(), facility(FAC_A, "Example Medical Centre")],
    });
    expect(profiles.map((item) => item.type)).toEqual(["professional", "facility"]);
    expect(profiles.some((item) => item.label.toLowerCase().includes("admin"))).toBe(
      false,
    );
    expect(productRolesFromMemberships("professional", membershipsForDual())).toEqual(
      ["professional", "facility"],
    );
  });
});

function membershipsForDual() {
  return [professional(), facility(FAC_A, "Clinic A")];
}
