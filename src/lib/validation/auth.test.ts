import { describe, expect, it } from "vitest";

import { LoginSchema, SignupSchema } from "./auth";

describe("auth validation", () => {
  it("trims signup fields and defaults to professional role", () => {
    const parsed = SignupSchema.parse({
      name: "  Tinashe Moyo  ",
      email: "  pro@example.com  ",
      password: "secret1",
    });

    expect(parsed).toEqual({
      name: "Tinashe Moyo",
      email: "pro@example.com",
      password: "secret1",
      role: "professional",
    });
  });

  it("rejects admin self-signup", () => {
    const parsed = SignupSchema.safeParse({
      name: "Platform Admin",
      email: "admin@example.com",
      password: "secret1",
      role: "admin",
    });

    expect(parsed.success).toBe(false);
  });

  it("allows only same-origin relative login redirects", () => {
    expect(
      LoginSchema.safeParse({
        email: "pro@example.com",
        password: "demo",
        next: "/professional/dashboard",
      }).success,
    ).toBe(true);
    expect(
      LoginSchema.safeParse({
        email: "pro@example.com",
        password: "demo",
        next: "//evil.example/path",
      }).success,
    ).toBe(false);
    expect(
      LoginSchema.safeParse({
        email: "pro@example.com",
        password: "demo",
        next: "https://evil.example/path",
      }).success,
    ).toBe(false);
  });
});
