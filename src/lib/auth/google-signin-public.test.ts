import { describe, expect, it } from "vitest";

import { GOOGLE_SIGNIN_PUBLIC } from "./google-signin-public";

describe("public Google sign-in", () => {
  it("is offered on public login and signup", () => {
    expect(GOOGLE_SIGNIN_PUBLIC).toBe(true);
  });
});
