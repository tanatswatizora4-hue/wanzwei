import { describe, expect, it } from "vitest";

import {
  PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE,
  isVerifiedProfessional,
} from "./professional-verification";

describe("professional verification gate", () => {
  it("allows only verified professionals", () => {
    expect(
      isVerifiedProfessional({ role: "professional", verified: true }),
    ).toBe(true);
    expect(
      isVerifiedProfessional({ role: "professional", verified: false }),
    ).toBe(false);
    expect(
      isVerifiedProfessional({ role: "facility", verified: true }),
    ).toBe(false);
    expect(
      isVerifiedProfessional({ role: "admin", verified: true }),
    ).toBe(false);
  });

  it("uses a user-facing message with no internal implementation details", () => {
    expect(PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE).toBe(
      "Professional verification is required to use this feature.",
    );
    expect(PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE).not.toMatch(
      /npm run|verified=|app_metadata|HPA matcher/i,
    );
  });
});
