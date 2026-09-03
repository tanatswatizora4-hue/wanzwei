import { describe, expect, it, vi } from "vitest";

import {
  confirmationSuccessPath,
  consumeEmailConfirmation,
  isPlausibleTokenHash,
  loginQueryForConsumeResult,
  parseConfirmEmailForm,
  parseConfirmEmailParams,
} from "./confirm-email";

const TOKEN = "a".repeat(40);
const AUTH_CODE = "b".repeat(40);

function authUser(overrides?: { id?: string; email?: string } | null) {
  if (overrides === null) return null;
  return {
    id: overrides?.id ?? "11111111-1111-4111-8111-111111111111",
    email: overrides?.email ?? "pro@example.com",
    app_metadata: { role: "professional" },
    user_metadata: {},
  };
}

function verifier(overrides?: {
  errorCode?: string;
  user?: ReturnType<typeof authUser>;
}) {
  const verifyOtp = vi.fn(async () => ({
    data: {
      user: "user" in (overrides ?? {}) ? overrides?.user ?? null : authUser(),
    },
    error: overrides?.errorCode ? { code: overrides.errorCode } : null,
  }));
  const exchangeCodeForSession = vi.fn(async () => ({
    data: { user: null },
    error: { code: "invalid_grant" },
  }));
  return { verifyOtp, exchangeCodeForSession };
}

describe("parseConfirmEmailParams", () => {
  it("accepts a signup token_hash without verifying it", () => {
    const parsed = parseConfirmEmailParams({
      tokenHash: TOKEN,
      type: "signup",
    });
    expect(parsed).toEqual({
      kind: "otp",
      tokenHash: TOKEN,
      type: "signup",
      next: null,
    });
  });

  it("treats a missing token as missing, not success", () => {
    expect(parseConfirmEmailParams({})).toEqual({ kind: "missing" });
  });

  it("treats a malformed token as malformed, not success", () => {
    expect(
      parseConfirmEmailParams({ tokenHash: "short", type: "signup" }),
    ).toEqual({ kind: "malformed" });
    expect(
      parseConfirmEmailParams({
        tokenHash: TOKEN,
        type: "not-a-type",
      }),
    ).toEqual({ kind: "malformed" });
    expect(isPlausibleTokenHash("token with spaces!!!!")).toBe(false);
  });
});

describe("consumeEmailConfirmation", () => {
  it("does not call verifyOtp for missing or malformed input", async () => {
    const auth = verifier();
    await consumeEmailConfirmation({ kind: "missing" }, auth);
    await consumeEmailConfirmation({ kind: "malformed" }, auth);
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("verifies only when an explicit otp payload is consumed", async () => {
    const auth = verifier();
    const result = await consumeEmailConfirmation(
      {
        kind: "otp",
        tokenHash: TOKEN,
        type: "signup",
        next: null,
      },
      auth,
    );
    expect(auth.verifyOtp).toHaveBeenCalledOnce();
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      type: "signup",
      token_hash: TOKEN,
    });
    expect(result.status).toBe("verified");
    expect(
      confirmationSuccessPath({
        kind: "otp",
        tokenHash: TOKEN,
        type: "signup",
        next: null,
      }),
    ).toBe("/login?verified=1");
  });

  it("maps expired tokens to expired, never success", async () => {
    const auth = verifier({ errorCode: "otp_expired", user: null });
    const result = await consumeEmailConfirmation(
      {
        kind: "otp",
        tokenHash: TOKEN,
        type: "signup",
        next: null,
      },
      auth,
    );
    expect(result.status).toBe("expired");
    expect(loginQueryForConsumeResult(result as { status: "expired" })).toBe(
      "link_used_or_expired",
    );
  });

  it("maps already-used tokens to expired, never success", async () => {
    const auth = verifier({ errorCode: "otp_expired", user: null });
    const result = await consumeEmailConfirmation(
      {
        kind: "otp",
        tokenHash: TOKEN,
        type: "signup",
        next: null,
      },
      auth,
    );
    expect(result.status).toBe("expired");
    expect(result.status).not.toBe("verified");
  });

  it("maps other Auth failures to invalid, never success", async () => {
    const auth = verifier({ errorCode: "invalid_grant", user: null });
    const result = await consumeEmailConfirmation(
      parseConfirmEmailForm(
        (() => {
          const form = new FormData();
          form.set("token_hash", TOKEN);
          form.set("type", "signup");
          return form;
        })(),
      ),
      auth,
    );
    expect(result.status).toBe("invalid");
    expect(loginQueryForConsumeResult(result as { status: "invalid" })).toBe(
      "auth_callback",
    );
  });

  it("sends signup confirmation to password login, not the dashboard", () => {
    expect(
      confirmationSuccessPath({
        kind: "otp",
        tokenHash: TOKEN,
        type: "signup",
        next: "/professional/dashboard",
      }),
    ).toBe("/login?verified=1");
  });

  it("sends recovery confirmation to reset-password, not login", () => {
    expect(
      confirmationSuccessPath({
        kind: "otp",
        tokenHash: TOKEN,
        type: "recovery",
        next: "/admin",
      }),
    ).toBe("/reset-password");
  });

  it("does not exchange a scanner GET parse as verification", async () => {
    const auth = verifier();
    parseConfirmEmailParams({
      tokenHash: TOKEN,
      type: "signup",
      code: AUTH_CODE,
    });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
