import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { verificationDocuments, verifications } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type {
  DbVerification,
  DbVerificationDocument,
  NewDbVerification,
  NewDbVerificationDocument,
} from "@/lib/db/schema";
import type { Verification } from "@/lib/types";

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
  };
}

export async function listVerifications(limit = 50): Promise<Verification[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("verifications", "listVerifications", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(verifications)
      .orderBy(desc(verifications.submittedAt))
      .limit(limit);
    return rows.map(toVerification);
  }, { limit });
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
