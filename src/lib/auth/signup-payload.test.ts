import { describe, expect, it } from "vitest";

import {
  readSignupPayload,
  signupFieldFlags,
} from "@/lib/auth/signup-payload";
import { SignupSchema } from "@/lib/validation/auth";

describe("signup payload", () => {
  it("reads FormData fields by expected names", () => {
    const formData = new FormData();
    formData.set("name", "Tinashe Moyo");
    formData.set("email", "pro@example.com");
    formData.set("password", "secret1");
    formData.set("role", "facility");

    expect(readSignupPayload(formData)).toEqual({
      name: "Tinashe Moyo",
      email: "pro@example.com",
      password: "secret1",
      role: "facility",
    });
  });

  it("defaults role to professional when FormData omits role", () => {
    const formData = new FormData();
    formData.set("name", "Tinashe Moyo");
    formData.set("email", "pro@example.com");
    formData.set("password", "secret1");

    const payload = readSignupPayload(formData);
    const parsed = SignupSchema.parse(payload);

    expect(parsed.role).toBe("professional");
  });

  it("defaults role to professional when FormData role is empty", () => {
    const formData = new FormData();
    formData.set("name", "Tinashe Moyo");
    formData.set("email", "pro@example.com");
    formData.set("password", "secret1");
    formData.set("role", "   ");

    const payload = readSignupPayload(formData);
    const parsed = SignupSchema.parse(payload);

    expect(parsed.role).toBe("professional");
  });

  it("reports field presence flags without password values", () => {
    const formData = new FormData();
    formData.set("name", "Tinashe Moyo");
    formData.set("email", "pro@example.com");
    formData.set("password", "secret1");
    formData.set("role", "professional");

    const flags = signupFieldFlags(readSignupPayload(formData));

    expect(flags).toEqual({
      hasName: true,
      hasEmail: true,
      hasPassword: true,
      role: "professional",
    });
    expect(flags).not.toHaveProperty("password");
  });
});
