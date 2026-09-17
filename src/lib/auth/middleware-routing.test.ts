import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const middleware = readFileSync("src/middleware.ts", "utf8");
const loginPage = readFileSync("src/app/(marketing)/login/page.tsx", "utf8");
const signupPage = readFileSync("src/app/(marketing)/signup/page.tsx", "utf8");
const session = readFileSync("src/lib/auth/session.ts", "utf8");
const workspace = readFileSync("src/lib/auth/workspace.ts", "utf8");
const appLayout = readFileSync("src/app/(app)/layout.tsx", "utf8");
const professionalLayout = readFileSync(
  "src/app/(app)/professional/layout.tsx",
  "utf8",
);
const facilityLayout = readFileSync("src/app/(app)/facility/layout.tsx", "utf8");

function matcherBlock(source: string): string {
  const start = source.indexOf("export const config");
  expect(start).toBeGreaterThan(-1);
  return source.slice(start);
}

describe("middleware stays off public routes", () => {
  const matcher = matcherBlock(middleware);

  it("does not match public auth or marketing routes", () => {
    for (const route of [
      "/login",
      "/signup",
      "/signup/check-email",
      "/forgot-password",
      "/reset-password",
      "/auth",
      "/privacy",
      "/terms",
      "/account-deletion",
    ]) {
      expect(matcher).not.toContain(`"${route}"`);
    }
    expect(matcher).not.toContain('"/login"');
    expect(matcher).not.toContain('"/signup"');
  });

  it("does not use a catch-all matcher", () => {
    expect(matcher).not.toMatch(/\/\(\(\?!/);
    expect(matcher).not.toContain("\"/\"");
  });

  it("still matches protected product prefixes", () => {
    expect(matcher).toContain('"/professional/:path*"');
    expect(matcher).toContain('"/facility/:path*"');
    expect(matcher).toContain('"/admin/:path*"');
    expect(matcher).toContain('"/workspaces/:path*"');
    expect(matcher).toContain('"/invitations/:path*"');
  });

  it("returns immediately on non-protected paths before remote Auth", () => {
    const guardIndex = middleware.indexOf("if (!isProtectedPath(pathname))");
    const authIndex = middleware.indexOf("await updateSession(req)");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeGreaterThan(guardIndex);
    expect(middleware.indexOf("return NextResponse.next();")).toBeGreaterThan(
      guardIndex,
    );
    expect(middleware.indexOf("return NextResponse.next();")).toBeLessThan(
      authIndex,
    );
  });

  it("public login and signup pages do not call remote Auth themselves", () => {
    expect(loginPage).not.toContain("getCurrentUser");
    expect(loginPage).not.toContain("updateSession");
    expect(loginPage).not.toContain("auth.getUser");
    expect(signupPage).not.toContain("getCurrentUser");
    expect(signupPage).not.toContain("updateSession");
    expect(signupPage).not.toContain("auth.getUser");
  });
});

describe("protected routing remains authoritative on the server", () => {
  it("still refreshes the session and gates unconfirmed users on protected paths", () => {
    expect(middleware).toContain("await updateSession(req)");
    expect(middleware).toContain("isEmailAuthConfirmed");
    expect(middleware).toContain("/signup/check-email");
    expect(middleware).toContain('url.pathname = "/login"');
  });

  it("still reads roles only from app_metadata", () => {
    expect(middleware).toContain("user.app_metadata");
    expect(middleware).not.toContain("user.user_metadata");
    expect(middleware).not.toContain("user_metadata.role");
  });

  it("app layouts still require a server profile", () => {
    expect(appLayout).toContain("getCurrentUser");
    expect(appLayout).toContain('redirect("/login")');
    expect(professionalLayout).toContain('requireRole(["professional"])');
    expect(facilityLayout).toContain('requireRole(["facility"])');
  });

  it("deduplicates getCurrentUser per request only", () => {
    expect(session).toContain('import { cache } from "react"');
    expect(session).toContain("export const getCurrentUser = cache(");
    expect(session).not.toContain("globalThis");
    expect(session).not.toContain("unstable_cache");
  });

  it("deduplicates workspace resolution per user id for the current request", () => {
    expect(workspace).toContain("const resolveWorkspaceForUserId = cache(");
    expect(workspace).toContain(
      "return resolveWorkspaceForUserId(user.id, user.role)",
    );
    expect(workspace).toContain("readWorkspacePreference");
    expect(workspace).not.toContain("unstable_cache");
  });

  it("loads independent shell data in parallel after the user is known", () => {
    expect(appLayout).toContain("await Promise.all([");
    expect(appLayout).toContain("resolveWorkspaceForUser(user)");
    expect(appLayout).toContain("switcherForUser(user)");
    const unreadIndex = appLayout.indexOf(
      "await countUnreadNotificationsForUser",
    );
    const navRoleIndex = appLayout.indexOf("const navRole");
    expect(unreadIndex).toBeGreaterThan(navRoleIndex);
  });
});
