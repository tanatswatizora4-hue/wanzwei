import { describe, expect, it } from "vitest";

import {
  VERIFICATION_SUBMIT_LOCK_NAMESPACE,
  verificationSubmitLockKeys,
} from "./lock";

describe("verificationSubmitLockKeys", () => {
  it("derives a stable int32 pair from the authenticated user id", () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const first = verificationSubmitLockKeys(userId);
    const second = verificationSubmitLockKeys(userId);
    expect(first).toEqual(second);
    expect(first.namespace).toBe(VERIFICATION_SUBMIT_LOCK_NAMESPACE);
    expect(first.key).toBeGreaterThanOrEqual(-2147483648);
    expect(first.key).toBeLessThanOrEqual(2147483647);
  });

  it("does not use the same key for different users", () => {
    const a = verificationSubmitLockKeys(
      "11111111-1111-4111-8111-111111111111",
    );
    const b = verificationSubmitLockKeys(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(a.namespace).toBe(b.namespace);
    expect(a.key).not.toBe(b.key);
  });
});
