import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { publicAccreditation } from "@/lib/cpd/certificate";
import { getDb, hasDbConfig } from "@/lib/db/client";
import { cpdCertificates } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbCpdCertificate, NewDbCpdCertificate } from "@/lib/db/schema";

export type CpdCertificateRecord = {
  id: string;
  certificateId: string;
  enrolmentId: string;
  userId: string;
  courseId: string;
  recipientDisplayName: string;
  courseTitle: string;
  providerName: string;
  completionDate: string;
  cpdPoints: number | null;
  accreditingBody: string | null;
  accreditationReference: string | null;
  issuedAt: string;
};

export function toCpdCertificate(row: DbCpdCertificate): CpdCertificateRecord {
  const accreditation = publicAccreditation({
    cpdPoints: row.cpdPoints == null ? null : Number(row.cpdPoints),
    accreditingBody: row.accreditingBody,
    accreditationReference: row.accreditationReference,
  });
  return {
    id: row.id,
    certificateId: row.certificateId,
    enrolmentId: row.enrolmentId,
    userId: row.userId,
    courseId: row.courseId,
    recipientDisplayName: row.recipientDisplayName,
    courseTitle: row.courseTitle,
    providerName: row.providerName,
    completionDate: String(row.completionDate),
    cpdPoints: accreditation?.cpdPoints ?? null,
    accreditingBody: accreditation?.accreditingBody ?? null,
    accreditationReference: accreditation?.accreditationReference ?? null,
    issuedAt: row.issuedAt.toISOString(),
  };
}

export async function getCertificateByPublicId(
  certificateId: string,
): Promise<CpdCertificateRecord | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "cpd_certificates",
    "getCertificateByPublicId",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(cpdCertificates)
        .where(eq(cpdCertificates.certificateId, certificateId))
        .limit(1);
      return rows[0] ? toCpdCertificate(rows[0]) : null;
    },
    { certificateId },
  );
}

export async function getCertificateForEnrolment(
  enrolmentId: string,
): Promise<CpdCertificateRecord | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "cpd_certificates",
    "getCertificateForEnrolment",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(cpdCertificates)
        .where(eq(cpdCertificates.enrolmentId, enrolmentId))
        .limit(1);
      return rows[0] ? toCpdCertificate(rows[0]) : null;
    },
    { enrolmentId },
  );
}

export async function listCertificatesForUser(
  userId: string,
): Promise<CpdCertificateRecord[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "cpd_certificates",
    "listCertificatesForUser",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(cpdCertificates)
        .where(eq(cpdCertificates.userId, userId))
        .orderBy(desc(cpdCertificates.issuedAt));
      return rows.map(toCpdCertificate);
    },
    { userId },
  );
}

export async function insertCertificate(
  certificate: NewDbCpdCertificate,
): Promise<CpdCertificateRecord | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("cpd_certificates", "insertCertificate", async () => {
    const db = getDb();
    const rows = await db.insert(cpdCertificates).values(certificate).returning();
    return rows[0] ? toCpdCertificate(rows[0]) : null;
  });
}

export async function getCertificateForUser(
  userId: string,
  certificateId: string,
): Promise<CpdCertificateRecord | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "cpd_certificates",
    "getCertificateForUser",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(cpdCertificates)
        .where(
          and(
            eq(cpdCertificates.certificateId, certificateId),
            eq(cpdCertificates.userId, userId),
          ),
        )
        .limit(1);
      return rows[0] ? toCpdCertificate(rows[0]) : null;
    },
    { userId, certificateId },
  );
}
