import { describe, expect, it } from "vitest";

import {
  isDuplicateAuthUserError,
  isEmailNotConfirmedError,
} from "./auth-errors";

describe("isDuplicateAuthUserError", () => {
  it("matches known Auth duplicate codes", () => {
    expect(isDuplicateAuthUserError({ code: "email_exists", message: "x" })).toBe(
      true,
    );
    expect(
      isDuplicateAuthUserError({ code: "user_already_exists", message: "x" }),
    ).toBe(true);
  });

  it("matches known duplicate-user wording", () => {
    expect(isDuplicateAuthUserError(new Error("User already registered"))).toBe(
      true,
    );
    expect(
      isDuplicateAuthUserError(
        new Error("A user with this email address has already been registered"),
      ),
    ).toBe(true);
    expect(isDuplicateAuthUserError(new Error("User already exists"))).toBe(true);
    expect(
      isDuplicateAuthUserError(new Error("Email already registered")),
    ).toBe(true);
  });

  it("does not treat schema-missing errors as duplicate email", () => {
    expect(
      isDuplicateAuthUserError(
        new Error("relation \"public.users\" does not exist"),
      ),
    ).toBe(false);
    expect(
      isDuplicateAuthUserError(new Error("column email does not exist")),
    ).toBe(false);
  });

  it("does not match the generic word exists alone", () => {
    expect(isDuplicateAuthUserError(new Error("value exists"))).toBe(false);
    expect(isDuplicateAuthUserError(new Error("already processed"))).toBe(false);
  });
});

describe("isEmailNotConfirmedError", () => {
  it("matches the Auth code and message", () => {
    expect(
      isEmailNotConfirmedError({ code: "email_not_confirmed", message: "x" }),
    ).toBe(true);
    expect(isEmailNotConfirmedError(new Error("Email not confirmed"))).toBe(
      true,
    );
  });

  it("does not match generic invalid credentials", () => {
    expect(isEmailNotConfirmedError(new Error("Invalid login credentials"))).toBe(
      false,
    );
  });
});
