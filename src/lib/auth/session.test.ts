import { describe, expect, it } from "vitest";

import {
  dashboardPathForRole,
  readRoleFromAuth,
} from "./session";
import {
  emailVerificationRedirectUrl,
  passwordResetRedirectUrl,
} from "./email";

describe("auth helpers", () => {
  it("reads roles only from app metadata", () => {
    expect(readRoleFromAuth({ app_metadata: { role: "facility" } })).toBe(
      "facility",
    );
    expect(
      readRoleFromAuth({
        app_metadata: {},
        user_metadata: { role: "admin" },
      } as Parameters<typeof readRoleFromAuth>[0]),
    ).toBeNull();
    expect(readRoleFromAuth({ app_metadata: { role: "owner" } })).toBeNull();
    expect(readRoleFromAuth({ app_metadata: {} })).toBeNull();
  });

  it("maps roles to dashboards", () => {
    expect(dashboardPathForRole("professional")).toBe("/professional/dashboard");
    expect(dashboardPathForRole("facility")).toBe("/facility/dashboard");
    expect(dashboardPathForRole("admin")).toBe("/admin/dashboard");
  });

  it("builds auth callback redirect URLs", () => {
    expect(emailVerificationRedirectUrl("https://app.example.com/signup")).toBe(
      "https://app.example.com/auth/callback",
    );
    expect(passwordResetRedirectUrl("https://app.example.com/login")).toBe(
      "https://app.example.com/auth/callback?next=%2Flogin%3Freset-password%3D1",
    );
  });
});
