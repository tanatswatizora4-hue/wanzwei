import { describe, expect, it } from "vitest";

import {
  PASSWORD_RESET_PUBLIC_ERRORS,
  publicMessageForPasswordUpdateError,
} from "./password-reset-errors";

describe("password reset public errors", () => {
  it("does not expose raw Auth/session internals", () => {
    expect(
      publicMessageForPasswordUpdateError("Auth session missing!"),
    ).toBe(PASSWORD_RESET_PUBLIC_ERRORS.missingSession);
    expect(publicMessageForPasswordUpdateError("Invalid JWT")).toBe(
      PASSWORD_RESET_PUBLIC_ERRORS.missingSession,
    );
    expect(
      publicMessageForPasswordUpdateError("New password should be different"),
    ).toBe(PASSWORD_RESET_PUBLIC_ERRORS.differentFromCurrent);
    const leaked = publicMessageForPasswordUpdateError(
      "PostgrestException from GoTrue secret xyz",
    );
    expect(leaked).toBe(PASSWORD_RESET_PUBLIC_ERRORS.failed);
    expect(leaked).not.toMatch(/Postgrest|GoTrue|secret/i);
  });
});
