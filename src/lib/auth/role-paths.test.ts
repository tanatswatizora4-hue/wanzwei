import { describe, expect, it } from "vitest";

import {
  authorizedPostAuthPath,
  authorizedPostAuthPathForAccount,
  dashboardPathForRole,
  loginErrorForProvisionFailure,
  pathAllowedForRole,
} from "./role-paths";

describe("authorizedPostAuthPath", () => {
  it("honours a safe next path only for the authenticated role", () => {
    expect(
      authorizedPostAuthPath("/professional/jobs", "professional"),
    ).toBe("/professional/jobs");
    expect(authorizedPostAuthPath("/facility/jobs/new", "facility")).toBe(
      "/facility/jobs/new",
    );
    expect(authorizedPostAuthPath("/admin/dashboard", "admin")).toBe(
      "/admin/dashboard",
    );
  });

  it("does not bounce a public user through /admin when next=/admin", () => {
    expect(authorizedPostAuthPath("/admin", "professional")).toBe(
      "/professional/dashboard",
    );
    expect(authorizedPostAuthPath("/admin/dashboard", "facility")).toBe(
      "/facility/dashboard",
    );
    expect(pathAllowedForRole("professional", "/admin")).toBe(false);
    expect(pathAllowedForRole("facility", "/admin/users")).toBe(false);
  });

  it("never uses /login as a successful post-auth destination", () => {
    expect(authorizedPostAuthPath("/login", "professional")).toBe(
      "/professional/dashboard",
    );
    expect(authorizedPostAuthPath("/login?verified=1", "facility")).toBe(
      "/facility/dashboard",
    );
    expect(authorizedPostAuthPath("/signup", "admin")).toBe("/admin/dashboard");
  });

  it("keeps reset-password for any role after recovery", () => {
    expect(authorizedPostAuthPath("/reset-password", "professional")).toBe(
      "/reset-password",
    );
    expect(authorizedPostAuthPath("/reset-password", "admin")).toBe(
      "/reset-password",
    );
  });

  it("falls back to the canonical dashboard", () => {
    expect(authorizedPostAuthPath(null, "professional")).toBe(
      dashboardPathForRole("professional"),
    );
    expect(authorizedPostAuthPath("//evil.example", "admin")).toBe(
      "/admin/dashboard",
    );
  });

  it("maps provision failures to generic login errors", () => {
    expect(loginErrorForProvisionFailure("no_role")).toBe("no_role");
    expect(loginErrorForProvisionFailure("db_not_configured")).toBe(
      "db_not_configured",
    );
    expect(loginErrorForProvisionFailure("profile_unavailable")).toBe(
      "profile_missing",
    );
    expect(loginErrorForProvisionFailure("account_closed")).toBe(
      "account_closed",
    );
  });
});

const USER = "11111111-1111-4111-8111-111111111111";
const FAC_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FAC_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("authorizedPostAuthPathForAccount", () => {
  it("honours a valid facility workspace cookie over signup role", () => {
    expect(
      authorizedPostAuthPathForAccount({
        next: null,
        signupRole: "professional",
        preference: { type: "facility", facilityId: FAC_A },
        memberships: [
          {
            id: "m-pro",
            userId: USER,
            profileType: "professional",
            professionalProfileId: USER,
            facilityId: null,
            membershipRole: "owner",
            status: "active",
          },
          {
            id: "m-fac",
            userId: USER,
            profileType: "facility",
            professionalProfileId: null,
            facilityId: FAC_A,
            membershipRole: "owner",
            status: "active",
          },
        ],
        userId: USER,
      }),
    ).toBe("/facility/dashboard");
  });

  it("ignores a revoked or unknown facility cookie and prefers professional", () => {
    expect(
      authorizedPostAuthPathForAccount({
        next: null,
        signupRole: "professional",
        preference: { type: "facility", facilityId: FAC_B },
        memberships: [
          {
            id: "m-pro",
            userId: USER,
            profileType: "professional",
            professionalProfileId: USER,
            facilityId: null,
            membershipRole: "owner",
            status: "active",
          },
          {
            id: "m-fac",
            userId: USER,
            profileType: "facility",
            professionalProfileId: null,
            facilityId: FAC_A,
            membershipRole: "recruiter",
            status: "active",
          },
        ],
        userId: USER,
      }),
    ).toBe("/professional/dashboard");
  });

  it("lets a professional-signup user with facility membership open facility next paths", () => {
    expect(
      authorizedPostAuthPathForAccount({
        next: "/facility/jobs",
        signupRole: "professional",
        preference: { type: "professional" },
        memberships: [
          {
            id: "m-pro",
            userId: USER,
            profileType: "professional",
            professionalProfileId: USER,
            facilityId: null,
            membershipRole: "owner",
            status: "active",
          },
          {
            id: "m-fac",
            userId: USER,
            profileType: "facility",
            professionalProfileId: null,
            facilityId: FAC_A,
            membershipRole: "admin",
            status: "active",
          },
        ],
        userId: USER,
      }),
    ).toBe("/facility/jobs");
  });
});

