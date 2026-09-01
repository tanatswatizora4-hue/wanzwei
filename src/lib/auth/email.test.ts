import { describe, expect, it } from "vitest";

import { emailVerificationRedirectUrl, passwordResetRedirectUrl } from "./email";

describe("auth email redirect URLs", () => {
  it("sends confirmation back to the request origin callback, not a hardcoded host", () => {
    expect(emailVerificationRedirectUrl("http://localhost:3000/api/auth/signup")).toBe(
      "http://localhost:3000/auth/callback",
    );
    expect(
      emailVerificationRedirectUrl("https://wanzwei.example/api/auth/signup"),
    ).toBe("https://wanzwei.example/auth/callback");
  });

  it("does not expose tokens in the confirmation redirect", () => {
    const url = emailVerificationRedirectUrl("http://localhost:3000/signup");
    expect(url).not.toMatch(/token/i);
    expect(url).not.toContain("access_token");
  });

  it("keeps password reset on the callback with a reset-password next path", () => {
    expect(passwordResetRedirectUrl("http://localhost:3000/forgot-password")).toBe(
      "http://localhost:3000/auth/callback?next=%2Freset-password",
    );
  });
});
