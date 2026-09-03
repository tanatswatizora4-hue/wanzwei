import { describe, expect, it } from "vitest";

import {
  EMAIL_CONFIRMED_LOGIN_PATH,
  isEmailAuthConfirmed,
  signupCheckEmailLocation,
  unconfirmedUserDestination,
} from "./signup-session";

describe("signup session gates", () => {
  it("sends email/password signup to check-email instead of the app", () => {
    expect(signupCheckEmailLocation("pro@example.com")).toBe(
      "/signup/check-email?email=pro%40example.com",
    );
    expect(signupCheckEmailLocation("not-an-email")).toBe("/signup/check-email");
  });

  it("does not treat an unconfirmed email user as authenticated app access", () => {
    expect(
      isEmailAuthConfirmed({
        email_confirmed_at: null,
        app_metadata: { provider: "email", providers: ["email"] },
        identities: [{ provider: "email" }],
      }),
    ).toBe(false);
    expect(unconfirmedUserDestination("pro@example.com")).toBe(
      "/signup/check-email?email=pro%40example.com",
    );
  });

  it("keeps Google OAuth users eligible for authenticated routes", () => {
    expect(
      isEmailAuthConfirmed({
        email_confirmed_at: "2026-09-02T00:00:00.000Z",
        app_metadata: { provider: "google", providers: ["google"] },
        identities: [{ provider: "google" }],
      }),
    ).toBe(true);
    expect(
      isEmailAuthConfirmed({
        email_confirmed_at: null,
        app_metadata: { provider: "google", providers: ["google"] },
        identities: [{ provider: "google" }],
      }),
    ).toBe(true);
  });

  it("sends confirmed email users to password login, not the dashboard", () => {
    expect(EMAIL_CONFIRMED_LOGIN_PATH).toBe("/login?verified=1");
  });
});
