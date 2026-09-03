import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("email confirmation architecture", () => {
  const page = readFileSync(
    "src/app/(marketing)/auth/confirm/page.tsx",
    "utf8",
  );
  const actions = readFileSync(
    "src/app/(marketing)/auth/confirm/actions.ts",
    "utf8",
  );
  const callback = readFileSync("src/app/auth/callback/route.ts", "utf8");
  const googleButton = readFileSync(
    "src/components/app/auth/google-sign-in-button.tsx",
    "utf8",
  );

  it("initial confirmation landing GET does not verify or exchange tokens", () => {
    expect(page).not.toContain("verifyOtp");
    expect(page).not.toContain("exchangeCodeForSession");
    expect(page).not.toContain("consumeEmailConfirmation");
    expect(page).toContain("parseConfirmEmailParams");
    expect(page).toContain('method="post"');
    expect(page).toContain("confirmEmailAction");
    expect(page).toContain("Confirm email");
  });

  it("explicit human confirmation POST verifies, then signs out for password login", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("consumeEmailConfirmation");
    expect(actions).toContain("verifyOtp");
    expect(actions).toContain("signOut");
    expect(actions).toContain("redirect");
  });

  it("auth callback GET does not consume email OTP tokens", () => {
    expect(callback).not.toContain("verifyOtp");
    expect(callback).toContain('"/auth/confirm"');
    expect(callback).toContain("exchangeCodeForSession");
  });

  it("Google sign-in is not prefetchable", () => {
    expect(googleButton).toContain("prefetch={false}");
  });

  it("keeps Google callback session exchange unchanged", () => {
    expect(callback).toContain("auth.google.callback_received");
    expect(callback).toContain("exchangeCodeForSession");
    expect(callback).toContain("authorizedPostAuthPath");
    expect(callback).not.toContain("/signup/check-email");
    expect(callback).not.toContain("/login?verified=1");
  });
});
