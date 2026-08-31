import "server-only";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { verificationEvents } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { NewDbVerificationEvent } from "@/lib/db/schema";
import type { VerificationEventMethod, VerificationStatus } from "@/lib/types";

export type VerificationEventInsert = {
  verificationId: string;
  actorUserId?: string | null;
  fromStatus: VerificationStatus | null;
  toStatus: VerificationStatus;
  method: VerificationEventMethod;
  matchRegistryId?: string | null;
  reason: string;
};

export async function insertVerificationEvent(
  event: VerificationEventInsert,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<void> {
  if (!hasDbConfig()) return;
  const values: NewDbVerificationEvent = {
    verificationId: event.verificationId,
    actorUserId: event.actorUserId ?? null,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    method: event.method,
    matchRegistryId: event.matchRegistryId ?? null,
    reason: event.reason,
  };
  await withRepositoryLogging(
    "verification-events",
    "insertVerificationEvent",
    async () => {
      await db.insert(verificationEvents).values(values);
    },
    { verificationId: event.verificationId, method: event.method },
  );
}
