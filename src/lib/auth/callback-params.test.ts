import { describe, expect, it } from "vitest";

import {
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
      postAuthNextPath("/login?reset-password=1", "/professional/dashboard"),
    ).toBe("/login?reset-password=1");
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
