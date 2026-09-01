import { describe, expect, it } from "vitest";

import {
  authorizedPostAuthPath,
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
  });
});
