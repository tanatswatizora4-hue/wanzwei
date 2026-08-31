import { createHash } from "node:crypto";

import { sql, type SQLWrapper } from "drizzle-orm";

/**
 * Application-owned namespace for verification-submit advisory locks.
 * Not derived from request input.
 */
export const VERIFICATION_SUBMIT_LOCK_NAMESPACE = 874_210_331;

export type VerificationSubmitLockKeys = {
  namespace: number;
  key: number;
};

type AdvisoryLockDb = {
  execute: (query: SQLWrapper) => Promise<unknown>;
};

/**
 * Deterministic pg_advisory_xact_lock keys for one authenticated user.
 * Same user → same pair; different users almost never collide.
 */
export function verificationSubmitLockKeys(
  userId: string,
): VerificationSubmitLockKeys {
  const digest = createHash("sha256")
    .update("wanzwei:verification-submit:")
    .update(userId)
    .digest();
  return {
    namespace: VERIFICATION_SUBMIT_LOCK_NAMESPACE,
    key: digest.readInt32BE(0),
  };
}

export async function acquireVerificationSubmitLock(
  db: AdvisoryLockDb,
  userId: string,
): Promise<VerificationSubmitLockKeys> {
  const keys = verificationSubmitLockKeys(userId);
  await db.execute(
    sql`select pg_advisory_xact_lock(${keys.namespace}::int4, ${keys.key}::int4)`,
  );
  return keys;
}
