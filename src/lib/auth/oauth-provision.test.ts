import { describe, expect, it } from "vitest";

import { displayNameFromAuthUser } from "@/lib/auth/oauth-provision";

describe("displayNameFromAuthUser", () => {
  it("prefers Google full_name metadata", () => {
    expect(
      displayNameFromAuthUser({
        email: "pro@example.com",
        user_metadata: { full_name: "Tinashe Moyo" },
      }),
    ).toBe("Tinashe Moyo");
  });

  it("falls back to the email local part", () => {
    expect(
      displayNameFromAuthUser({
        email: "pro@example.com",
        user_metadata: {},
      }),
    ).toBe("pro");
  });
});
