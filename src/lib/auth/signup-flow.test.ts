import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("email/password signup does not open the app", () => {
  const signup = readFileSync("src/app/api/auth/signup/route.ts", "utf8");
  const admin = readFileSync("src/lib/supabase/admin.ts", "utf8");
  const middleware = readFileSync("src/middleware.ts", "utf8");
  const checkEmail = readFileSync(
    "src/app/(marketing)/signup/check-email/page.tsx",
    "utf8",
  );
  const confirmActions = readFileSync(
    "src/app/(marketing)/auth/confirm/actions.ts",
    "utf8",
  );
  const login = readFileSync("src/app/api/auth/login/route.ts", "utf8");

  it("creates Auth users unconfirmed and does not password-sign-in", () => {
    expect(admin).toContain("email_confirm: false");
    expect(signup).not.toContain("signInWithPassword");
    expect(signup).not.toContain("exchangeCodeForSession");
    expect(signup).toContain("signOut");
    expect(signup).toContain("signupCheckEmailLocation");
  });

  it("redirects signup success to the check-email page", () => {
    expect(checkEmail).toContain("Check your email to verify your account before signing in.");
    expect(checkEmail).not.toContain("/professional/dashboard");
    expect(checkEmail).not.toContain("AppShell");
  });

  it("blocks unconfirmed users from authenticated routes", () => {
    expect(middleware).toContain("isEmailAuthConfirmed");
    expect(middleware).toContain("/signup/check-email");
  });

  it("confirmation POST verifies then sends the user to password login", () => {
    expect(confirmActions).toContain("consumeEmailConfirmation");
    expect(confirmActions).toContain("signOut");
    expect(confirmActions).toContain("confirmationSuccessPath");
  });

  it("password login rejects unconfirmed email and allows confirmed users through", () => {
    expect(login).toContain("isEmailNotConfirmedError");
    expect(login).toContain("isEmailAuthConfirmed");
    expect(login).toContain("signInWithPassword");
    expect(login).toContain("auth.password.login_success");
  });
});
