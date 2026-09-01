import { describe, expect, it } from "vitest";

import {
  loginErrorForAuthApiFailure,
  loginErrorForCallbackAuthError,
  parseCallbackAuthError,
  parseCallbackSessionParams,
  postAuthNextPath,
} from "./callback-params";

describe("parseCallbackSessionParams", () => {
  it("reads a PKCE code used by Google OAuth", () => {
    const url = new URL("https://app.example/auth/callback?code=abc123");
    expect(parseCallbackSessionParams(url)).toEqual({
      kind: "code",
      code: "abc123",
    });
  });

  it("reads an email confirmation token_hash without treating it as a code", () => {
    const url = new URL(
      "https://app.example/auth/callback?token_hash=otp-token&type=signup",
    );
    expect(parseCallbackSessionParams(url)).toEqual({
      kind: "otp",
      tokenHash: "otp-token",
      type: "signup",
    });
  });

  it("ignores unknown otp types", () => {
    const url = new URL(
      "https://app.example/auth/callback?token_hash=otp-token&type=not-a-type",
    );
    expect(parseCallbackSessionParams(url)).toEqual({ kind: "none" });
  });
});

describe("postAuthNextPath", () => {
  it("sends legacy confirmation next=/login?verified=1 into the app", () => {
    expect(postAuthNextPath("/login?verified=1", "/professional/dashboard")).toBe(
      "/professional/dashboard",
    );
  });

  it("keeps password-reset next paths", () => {
    expect(
      postAuthNextPath("/reset-password", "/professional/dashboard"),
    ).toBe("/reset-password");
  });

  it("rejects open redirects", () => {
    expect(
      postAuthNextPath("https://evil.example", "/professional/dashboard"),
    ).toBe("/professional/dashboard");
    expect(postAuthNextPath("//evil.example", "/professional/dashboard")).toBe(
      "/professional/dashboard",
    );
  });
});

describe("parseCallbackAuthError", () => {
  it("maps otp_expired without claiming confirmation succeeded", () => {
    const url = new URL(
      "https://app.example/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email%20link%20is%20invalid%20or%20has%20expired",
    );
    expect(parseCallbackAuthError(url)).toEqual({ kind: "otp_expired" });
    expect(loginErrorForCallbackAuthError(parseCallbackAuthError(url))).toBe(
      "link_used_or_expired",
    );
  });

  it("maps other GoTrue errors to the generic callback error", () => {
    const url = new URL(
      "https://app.example/auth/callback?error=server_error&error_code=unexpected",
    );
    expect(parseCallbackAuthError(url)).toEqual({ kind: "other" });
    expect(loginErrorForCallbackAuthError(parseCallbackAuthError(url))).toBe(
      "auth_callback",
    );
  });

  it("does not treat a valid code callback as an Auth error", () => {
    const url = new URL("https://app.example/auth/callback?code=abc123");
    expect(parseCallbackAuthError(url)).toEqual({ kind: "none" });
    expect(loginErrorForCallbackAuthError({ kind: "none" })).toBeNull();
  });

  it("maps verifyOtp otp_expired to the same login error", () => {
    expect(loginErrorForAuthApiFailure("otp_expired")).toBe(
      "link_used_or_expired",
    );
    expect(loginErrorForAuthApiFailure("invalid_grant")).toBe("auth_callback");
  });
});
