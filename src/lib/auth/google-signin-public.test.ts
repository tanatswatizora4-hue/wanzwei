import { describe, expect, it } from "vitest";

import { GOOGLE_SIGNIN_PUBLIC } from "./google-signin-public";

describe("public Google sign-in", () => {
  it("is hidden until the Cloud redirect URI is verified", () => {
    expect(GOOGLE_SIGNIN_PUBLIC).toBe(false);
  });
});
