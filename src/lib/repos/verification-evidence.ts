import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { verificationEvidence } from "@/lib/db/schema";

export type VerificationEvidenceView = {
  identityName: string | null;
  identityDocumentType: string | null;
  identityQuality: string | null;
  credentialName: string | null;
  credentialType: string | null;
  credentialClass: string | null;
  credentialQuality: string | null;
  detectedProfession: string | null;
  issuingBody: string | null;
  regulatoryBody: string | null;
  regulatoryBodyOther: string | null;
  registrationNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  nameMatch: string | null;
  professionMatch: string | null;
  expiryCheck: string | null;
  registryOutcome: string | null;
  analysisStatus: string;
  decision: string;
  decisionReason: string;
  verificationMethod: string;
  reviewRequired: boolean;
};

export async function findLatestVerificationEvidence(
  verificationId: string,
): Promise<VerificationEvidenceView | null> {
  if (!hasDbConfig()) return null;
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(verificationEvidence)
      .where(eq(verificationEvidence.verificationId, verificationId))
      .orderBy(desc(verificationEvidence.createdAt))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      identityName: row.identityName,
      identityDocumentType: row.identityDocumentType,
      identityQuality: row.identityQuality,
      credentialName: row.credentialName,
      credentialType: row.credentialType,
      credentialClass: row.credentialClass,
      credentialQuality: row.credentialQuality,
      detectedProfession: row.detectedProfession,
      issuingBody: row.issuingBody,
      regulatoryBody: row.regulatoryBody ?? null,
      regulatoryBodyOther: row.regulatoryBodyOther ?? null,
      registrationNumber: row.registrationNumber,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
      nameMatch: row.nameMatch,
      professionMatch: row.professionMatch,
      expiryCheck: row.expiryCheck,
      registryOutcome: row.registryOutcome,
      analysisStatus: row.analysisStatus,
      decision: row.decision,
      decisionReason: row.decisionReason,
      verificationMethod: row.verificationMethod,
      reviewRequired: row.reviewRequired,
    };
  } catch {
    return null;
  }
}
