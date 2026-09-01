import { afterEach, describe, expect, it, vi } from "vitest";

import { logAuthEvent } from "./auth-log";
import { runWithRequestLog } from "./request-context";

describe("auth observability redaction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes a request id and never writes auth secrets", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    runWithRequestLog({ requestId: "req-auth-1", route: "/auth/confirm" }, () => {
      logAuthEvent("auth.confirmation.landing", {
        token_hash: "super-secret-token-hash",
        otp: "123456",
        password: "hunter2",
        code_verifier: "pkce-verifier-secret",
        access_token: "secret-access-token-value",
        refresh_token: "secret-refresh-token-value",
        service_role: "service-role-key",
      });
    });

    const raw = String(spy.mock.calls[0]?.[0] ?? "");
    expect(raw).toContain("req-auth-1");
    expect(raw).toContain("/auth/confirm");
    expect(raw).toContain("auth.confirmation.landing");
    expect(raw).not.toContain("super-secret-token-hash");
    expect(raw).not.toContain("123456");
    expect(raw).not.toContain("hunter2");
    expect(raw).not.toContain("pkce-verifier-secret");
    expect(raw).not.toContain("secret-access-token-value");
    expect(raw).not.toContain("secret-refresh-token-value");
    expect(raw).not.toContain("service-role-key");
    expect(raw).toContain("[redacted]");
  });
});
