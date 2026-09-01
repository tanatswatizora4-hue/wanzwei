import { describe, expect, it } from "vitest";

import { emailVerificationRedirectUrl, passwordResetRedirectUrl, SUPABASE_AUTH_EMAIL_SETUP } from "./email";

describe("auth email redirect URLs", () => {
  it("sends confirmation back to the request origin confirm page, not a hardcoded host", () => {
    expect(emailVerificationRedirectUrl("http://localhost:3000/api/auth/signup")).toBe(
      "http://localhost:3000/auth/confirm",
    );
    expect(
      emailVerificationRedirectUrl("https://wanzwei.example/api/auth/signup"),
    ).toBe("https://wanzwei.example/auth/confirm");
  });

  it("does not expose tokens in the confirmation redirect", () => {
    const url = emailVerificationRedirectUrl("http://localhost:3000/signup");
    expect(url).not.toMatch(/token/i);
    expect(url).not.toContain("access_token");
  });

  it("keeps password reset on the confirm page with a reset-password next path", () => {
    expect(passwordResetRedirectUrl("http://localhost:3000/forgot-password")).toBe(
      "http://localhost:3000/auth/confirm?next=%2Freset-password",
    );
  });

  it("documents the TokenHash email template, not ConfirmationURL GET verify", () => {
    const setup = SUPABASE_AUTH_EMAIL_SETUP.join(" ");
    expect(setup).toContain("/auth/confirm?token_hash={{ .TokenHash }}");
    expect(setup).toContain("Do not use {{ .ConfirmationURL }}");
  });
});
