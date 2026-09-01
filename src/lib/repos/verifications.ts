import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { verificationDocuments, verificationEvents, verifications, users } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type {
  DbVerification,
  DbVerificationDocument,
  NewDbVerification,
  NewDbVerificationDocument,
} from "@/lib/db/schema";
import type { Verification, VerificationMatchOutcome, VerificationStatus } from "@/lib/types";

const MATCH_OUTCOMES: readonly VerificationMatchOutcome[] = [
  "matched",
  "not_found",
  "expired",
  "ambiguous",
  "profession_mismatch",
  "name_mismatch",
  "missing_registration_number",
  "registry_lookup_failed",
  "non_clinical_qualification",
];

function toMatchOutcome(
  value: string | null,
): VerificationMatchOutcome | undefined {
  if (value == null) return undefined;
  return MATCH_OUTCOMES.find((outcome) => outcome === value);
}

export function toVerification(row: DbVerification): Verification {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    profession: row.profession,
    status: row.status,
    documentCount: row.documentCount,
    submittedAt: row.submittedAt.toISOString(),
    flags: row.flags.length > 0 ? row.flags : undefined,
    registeringBody: row.registeringBody ?? undefined,
    registrationNumber: row.registrationNumber ?? undefined,
    matchedRegistryId: row.matchedRegistryId ?? undefined,
    matchOutcome: toMatchOutcome(row.matchOutcome),
  };
}

export async function listVerifications(
  limit = 50,
  status?: VerificationStatus,
): Promise<Verification[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("verifications", "listVerifications", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(verifications)
      .where(status ? eq(verifications.status, status) : undefined)
      .orderBy(desc(verifications.submittedAt))
      .limit(limit);
    return rows.map(toVerification);
  }, { limit, status });
}

export async function getVerification(id: string): Promise<Verification | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("verifications", "getVerification", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(verifications)
      .where(eq(verifications.id, id))
      .limit(1);
    return rows[0] ? toVerification(rows[0]) : null;
  }, { id });
}

export async function createVerification(
  verification: NewDbVerification,
): Promise<Verification | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("verifications", "createVerification", async () => {
    const db = getDb();
    const rows = await db.insert(verifications).values(verification).returning();
    return rows[0] ? toVerification(rows[0]) : null;
  }, { userId: verification.userId, status: verification.status });
}

export async function updateVerificationStatus(
  id: string,
  status: Verification["status"],
): Promise<Verification | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("verifications", "updateVerificationStatus", async () => {
    const db = getDb();
    const rows = await db
      .update(verifications)
      .set({ status, updatedAt: new Date() })
      .where(eq(verifications.id, id))
      .returning();
    return rows[0] ? toVerification(rows[0]) : null;
  }, { id, status });
}

export type VerificationEventRow = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  method: string;
  reason: string | null;
  createdAt: string;
  actorUserId: string | null;
  actorName: string | null;
};

export async function listVerificationEvents(
  verificationId: string,
): Promise<VerificationEventRow[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "verifications",
    "listVerificationEvents",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          id: verificationEvents.id,
          fromStatus: verificationEvents.fromStatus,
          toStatus: verificationEvents.toStatus,
          method: verificationEvents.method,
          reason: verificationEvents.reason,
          createdAt: verificationEvents.createdAt,
          actorUserId: verificationEvents.actorUserId,
          actorName: users.name,
        })
        .from(verificationEvents)
        .leftJoin(users, eq(users.id, verificationEvents.actorUserId))
        .where(eq(verificationEvents.verificationId, verificationId))
        .orderBy(desc(verificationEvents.createdAt));
      return rows.map((row) => ({
        id: row.id,
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        method: row.method,
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
        actorUserId: row.actorUserId,
        actorName: row.actorName ?? null,
      }));
    },
    { verificationId },
  );
}

export async function listVerificationDocuments(
  verificationId: string,
): Promise<DbVerificationDocument[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "verifications",
    "listVerificationDocuments",
    async () => {
      const db = getDb();
      return db
        .select()
        .from(verificationDocuments)
        .where(eq(verificationDocuments.verificationId, verificationId))
        .orderBy(desc(verificationDocuments.uploadedAt));
    },
    { verificationId },
  );
}

export async function createVerificationDocument(
  document: NewDbVerificationDocument,
): Promise<DbVerificationDocument | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "verifications",
    "createVerificationDocument",
    async () => {
      const db = getDb();
      const rows = await db
        .insert(verificationDocuments)
        .values(document)
        .returning();
      return rows[0] ?? null;
    },
    { verificationId: document.verificationId },
  );
}
