import "server-only";

import { and, count, desc, eq, ne } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { users, verificationEvidence, verifications } from "@/lib/db/schema";
import { findRegistryByRegistration } from "@/lib/repos/practitioner-registry";
import { insertVerificationEvent } from "@/lib/repos/verification-events";
import { toVerification } from "@/lib/repos/verifications";
import {
  classifyRegistryMatch,
  normalizeRegisteringBody,
  type RegistryMatchRecord,
} from "@/lib/registry/match";
import {
  formatParsedPersonNumber,
  normalizeRegistrationNumber,
  parseNormalizedPersonNumber,
} from "@/lib/registry/persons-register";
import type {
  User,
  Verification,
  VerificationMatchOutcome,
  VerificationStatus,
} from "@/lib/types";
import type { SubmitVerificationInput } from "@/lib/validation/verifications";
import { acquireVerificationSubmitLock } from "@/lib/verification/lock";
import {
  getCredentialDocumentAnalyzer,
  getIdentityDocumentAnalyzer,
} from "@/lib/verification/analyzers";
import { decideHybridVerification, mapHybridDecisionToVerificationStatus } from "@/lib/verification/decision-engine";
import { registryEvidenceFromMatch } from "@/lib/verification/registry-evidence";
import type {
  CredentialAnalysis,
  IdentityAnalysis,
} from "@/lib/verification/hybrid-types";
import { createUploadClient, isSupabaseConfigured } from "@/lib/supabase/service";
import { isMissingTableError } from "@/lib/supabase/errors";
import { loadOwnedDocumentForAnalysis } from "@/lib/verification/load-document";
import { extractionQualityOf } from "@/lib/verification/decision-engine";

export type { PublicVerificationState } from "@/lib/verification/public-result";
export {
  publicStateFromVerification,
  publicVerificationMessage,
} from "@/lib/verification/public-result";

export type SubmitVerificationResult = {
  verification: Verification;
  reusedExisting: boolean;
  userVerified: boolean;
  eventWritten: boolean;
};

export type SubmitVerificationErrorCode =
  | "db_not_configured"
  | "forbidden_role"
  | "invalid_documents";

export class SubmitVerificationError extends Error {
  readonly code: SubmitVerificationErrorCode;

  constructor(code: SubmitVerificationErrorCode, message: string) {
    super(message);
    this.name = "SubmitVerificationError";
    this.code = code;
  }
}

type CaseRow = {
  id: string;
  userId: string;
  name: string;
  profession: string;
  status: VerificationStatus;
  registeringBody: string | null;
  registrationNumber: string | null;
  matchOutcome: string | null;
  matchedRegistryId: string | null;
  documentCount: number;
  submittedAt: Date;
  createdAt: Date;
  flags: string[];
};

export type CaseOrderFields = {
  submittedAt: Date;
  createdAt: Date;
  id: string;
};

export type VerificationWriteTx = {
  acquireUserLock: (userId: string) => Promise<void>;
  lookupRegistry: (
    registeringBody: string,
    registrationNumber: string,
  ) => Promise<RegistryMatchRecord[]>;
  findCurrentCase: (userId: string) => Promise<CaseRow | null>;
  getById: (id: string) => Promise<CaseRow | null>;
  insertCase: (input: {
    userId: string;
    name: string;
    profession: string;
    registeringBody: string;
    registrationNumber: string;
    status: VerificationStatus;
    matchOutcome: VerificationMatchOutcome;
    matchedRegistryId: string | null;
  }) => Promise<CaseRow>;
  updateCase: (
    id: string,
    patch: {
      name: string;
      profession: string;
      registeringBody: string;
      registrationNumber: string;
      status: VerificationStatus;
      matchOutcome: VerificationMatchOutcome;
      matchedRegistryId: string | null;
      touchSubmittedAt?: boolean;
    },
  ) => Promise<CaseRow>;
  setUserVerified: (userId: string, verified: boolean) => Promise<void>;
  updateUserCredentials: (
    userId: string,
    patch: {
      profession: string;
      registeringBody: string;
      registrationNumber: string;
    },
  ) => Promise<void>;
  insertEvent: (event: {
    verificationId: string;
    actorUserId?: string | null;
    fromStatus: VerificationStatus | null;
    toStatus: VerificationStatus;
    method: "auto" | "admin";
    matchRegistryId: string | null;
    reason: string;
  }) => Promise<void>;
  insertEvidence?: (row: {
    verificationId: string;
    userId: string;
    identityDocumentId?: string | null;
    credentialDocumentId?: string | null;
    identityName?: string | null;
    identityDocumentType?: string | null;
    credentialName?: string | null;
    credentialType?: string | null;
    detectedProfession?: string | null;
    registrationNumber?: string | null;
    issuingBody?: string | null;
    issueDate?: string | null;
    expiryDate?: string | null;
    nameMatch: string;
    professionMatch: string;
    expiryCheck: string;
    registryAvailable: boolean;
    registryOutcome: string;
    registryNameMatch: boolean | null;
    registryProfessionMatch: boolean | null;
    documentQuality?: string | null;
    identityQuality?: string | null;
    credentialQuality?: string | null;
    credentialClass?: string | null;
    fraudFlags?: string | null;
    analysisStatus: string;
    decision: string;
    decisionReason: string;
    verificationMethod: string;
    reviewRequired: boolean;
  }) => Promise<void>;
  countOtherVerifiedCases: (
    userId: string,
    exceptVerificationId: string,
  ) => Promise<number>;
};

export type SubmitVerificationStore = {
  hasDbConfig: () => boolean;
  runInTransaction: <T>(fn: (tx: VerificationWriteTx) => Promise<T>) => Promise<T>;
  analyzeIdentity?: () => Promise<IdentityAnalysis>;
  analyzeCredential?: () => Promise<CredentialAnalysis>;
  assertOwnedDocuments?: (
    userId: string,
    identityDocumentId: string,
    credentialDocumentId: string,
  ) => Promise<void>;
};

export function compareCurrentCaseOrder(
  a: CaseOrderFields,
  b: CaseOrderFields,
): number {
  const submitted = b.submittedAt.getTime() - a.submittedAt.getTime();
  if (submitted !== 0) return submitted;
  const created = b.createdAt.getTime() - a.createdAt.getTime();
  if (created !== 0) return created;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

export function pickCurrentCase<T extends CaseOrderFields>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  return [...rows].sort(compareCurrentCaseOrder)[0] ?? null;
}

function canonicalRegistrationNumber(raw: string): string {
  const parsed = parseNormalizedPersonNumber(raw);
  return parsed ? formatParsedPersonNumber(parsed) : raw.trim();
}

function sameLicenceIdentity(
  row: CaseRow,
  input: SubmitVerificationInput,
): boolean {
  return (
    normalizeRegisteringBody(row.registeringBody ?? "") ===
      normalizeRegisteringBody(input.registeringBody ?? "") &&
    normalizeRegistrationNumber(row.registrationNumber ?? "") ===
      normalizeRegistrationNumber(input.registrationNumber ?? "")
  );
}

function computedEqualsPersisted(
  row: CaseRow,
  computed: {
    status: VerificationStatus;
    matchOutcome: VerificationMatchOutcome;
    matchedRegistryId: string | null;
    registeringBody: string;
    registrationNumber: string;
    profession: string;
  },
): boolean {
  return (
    row.status === computed.status &&
    row.matchOutcome === computed.matchOutcome &&
    (row.matchedRegistryId ?? null) === computed.matchedRegistryId &&
    normalizeRegisteringBody(row.registeringBody ?? "") ===
      computed.registeringBody &&
    normalizeRegistrationNumber(row.registrationNumber ?? "") ===
      normalizeRegistrationNumber(computed.registrationNumber) &&
    (row.profession ?? "").trim().toLowerCase() ===
      computed.profession.trim().toLowerCase()
  );
}

function toVerificationFromCase(row: CaseRow): Verification {
  return toVerification({
    id: row.id,
    userId: row.userId,
    name: row.name,
    profession: row.profession,
    status: row.status,
    documentCount: row.documentCount,
    submittedAt: row.submittedAt,
    flags: row.flags,
    registeringBody: row.registeringBody,
    registrationNumber: row.registrationNumber,
    matchedRegistryId: row.matchedRegistryId,
    matchOutcome: row.matchOutcome,
    createdAt: row.createdAt,
    updatedAt: row.submittedAt,
  });
}

export async function submitProfessionalVerification(
  user: User,
  input: SubmitVerificationInput,
  store: SubmitVerificationStore = defaultSubmitStore,
): Promise<SubmitVerificationResult> {
  if (user.role !== "professional") {
    throw new SubmitVerificationError(
      "forbidden_role",
      "Only professionals can submit verification credentials.",
    );
  }
  if (!store.hasDbConfig()) {
    throw new SubmitVerificationError(
      "db_not_configured",
      "Database is not configured.",
    );
  }
  if (input.identityDocumentId === input.credentialDocumentId) {
    throw new SubmitVerificationError(
      "invalid_documents",
      "Identity and credential documents must be different files.",
    );
  }
  await store.assertOwnedDocuments?.(
    user.id,
    input.identityDocumentId,
    input.credentialDocumentId,
  );

  return store.runInTransaction(async (tx) => {
    await tx.acquireUserLock(user.id);
    const existing = await tx.findCurrentCase(user.id);

    const registrationNumber = input.registrationNumber?.trim() ?? "";
    let rows: RegistryMatchRecord[] = [];
    let lookupFailed = false;
    if (registrationNumber) {
      try {
        rows = await tx.lookupRegistry(
          input.registeringBody ?? "HPA",
          registrationNumber,
        );
      } catch {
        lookupFailed = true;
      }
    }

    const identity = store.analyzeIdentity
      ? await store.analyzeIdentity()
      : await getIdentityDocumentAnalyzer().analyze(
          (await loadOwnedDocumentForAnalysis(
            user.id,
            input.identityDocumentId,
          )) ?? { storagePath: "", contentType: "" },
        );
    const credential = store.analyzeCredential
      ? await store.analyzeCredential()
      : await getCredentialDocumentAnalyzer().analyze(
          (await loadOwnedDocumentForAnalysis(
            user.id,
            input.credentialDocumentId,
          )) ?? { storagePath: "", contentType: "" },
        );

    const registry = registryEvidenceFromMatch({
      submittedName: user.name,
      submittedProfession: input.profession,
      registeringBody: input.registeringBody,
      registrationNumber: registrationNumber || undefined,
      rows,
      lookupFailed,
    });

    const classified = lookupFailed
      ? {
          outcome: "registry_lookup_failed" as const,
          autoVerify: false,
          matchedRegistryId: null,
          reason: "Registry lookup failed.",
        }
      : registrationNumber
        ? classifyRegistryMatch({
            registeringBody: input.registeringBody ?? "HPA",
            registrationNumber,
            submittedName: user.name,
            submittedProfession: input.profession,
            rows,
          })
        : {
            outcome: "missing_registration_number" as const,
            autoVerify: false,
            matchedRegistryId: null,
            reason: registry.reason,
          };

    const hybrid = decideHybridVerification({
      hasIdentityDocument: Boolean(input.identityDocumentId),
      hasCredentialDocument: Boolean(input.credentialDocumentId),
      submittedName: user.name,
      submittedProfession: input.profession,
      identity,
      credential,
      registry,
    });

    return persistDecision(tx, {
      user,
      input,
      existing,
      outcome: classified.outcome,
      autoVerify: hybrid.decision === "verified",
      matchedRegistryId: classified.matchedRegistryId,
      reason: hybrid.decisionReason,
      hybrid,
      identity,
      credential,
      registry,
    });
  });
}

async function persistDecision(
  tx: VerificationWriteTx,
  args: {
    user: User;
    input: SubmitVerificationInput;
    existing: CaseRow | null;
    outcome: VerificationMatchOutcome;
    autoVerify: boolean;
    matchedRegistryId: string | null;
    reason: string;
    hybrid: ReturnType<typeof decideHybridVerification>;
    identity: IdentityAnalysis;
    credential: CredentialAnalysis;
    registry: ReturnType<typeof registryEvidenceFromMatch>;
  },
): Promise<SubmitVerificationResult> {
  const classifiedStatus = mapHybridDecisionToVerificationStatus(
    args.hybrid.decision,
  );
  const body = normalizeRegisteringBody(args.input.registeringBody ?? "");
  const registrationNumber = args.input.registrationNumber
    ? canonicalRegistrationNumber(args.input.registrationNumber)
    : "";

  const preserveVerifiedHistory =
    args.existing?.status === "Verified" &&
    !(
      args.autoVerify &&
      args.outcome === "matched" &&
      sameLicenceIdentity(args.existing, args.input)
    );

  const toStatus: VerificationStatus = preserveVerifiedHistory
    ? "Under Review"
    : classifiedStatus;

  const computed = {
    status: toStatus,
    matchOutcome: args.outcome,
    matchedRegistryId: args.matchedRegistryId,
    registeringBody: body,
    registrationNumber,
    profession: args.input.profession,
  };

  if (
    args.existing &&
    !preserveVerifiedHistory &&
    computedEqualsPersisted(args.existing, computed)
  ) {
    return {
      verification: toVerificationFromCase(args.existing),
      reusedExisting: true,
      userVerified:
        args.user.verified === true || args.existing.status === "Verified",
      eventWritten: false,
    };
  }

  const patch = {
    name: args.user.name,
    profession: args.input.profession,
    registeringBody: body,
    registrationNumber,
    status: toStatus,
    matchOutcome: args.outcome,
    matchedRegistryId: args.matchedRegistryId,
  };

  const saved =
    preserveVerifiedHistory || !args.existing
      ? await tx.insertCase({
          userId: args.user.id,
          ...patch,
        })
      : await tx.updateCase(args.existing.id, {
          ...patch,
          touchSubmittedAt: true,
        });

  await tx.updateUserCredentials(args.user.id, {
    profession: args.input.profession,
    registeringBody: body,
    registrationNumber,
  });

  let userVerified =
    args.user.verified === true || args.existing?.status === "Verified";
  if (toStatus === "Verified") {
    await tx.setUserVerified(args.user.id, true);
    userVerified = true;
  }

  await tx.insertEvent({
    verificationId: saved.id,
    fromStatus:
      preserveVerifiedHistory || !args.existing
        ? null
        : args.existing.status,
    toStatus,
    method: "auto",
    matchRegistryId: args.matchedRegistryId,
    reason: args.reason,
  });

  await tx.insertEvidence?.({
    verificationId: saved.id,
    userId: args.user.id,
    identityDocumentId: args.input.identityDocumentId,
    credentialDocumentId: args.input.credentialDocumentId,
    identityName: args.identity.identityName ?? null,
    identityDocumentType: args.identity.identityDocumentType ?? null,
    credentialName: args.credential.credentialName ?? null,
    credentialType: args.credential.credentialType ?? null,
    detectedProfession: args.credential.detectedProfession ?? null,
    registrationNumber: args.credential.registrationNumber ?? registrationNumber,
    issuingBody: args.credential.issuingBody ?? (body || null),
    issueDate: args.credential.issueDate ?? null,
    expiryDate: args.credential.expiryDate ?? null,
    nameMatch: args.hybrid.nameMatch,
    professionMatch: args.hybrid.professionMatch,
    expiryCheck: args.hybrid.expiryCheck,
    registryAvailable: args.registry.registryAvailable,
    registryOutcome: args.registry.outcome,
    registryNameMatch: args.registry.registryNameMatch,
    registryProfessionMatch: args.registry.registryProfessionMatch,
    documentQuality:
      args.identity.documentQuality ?? args.credential.documentQuality ?? null,
    identityQuality: extractionQualityOf(args.identity),
    credentialQuality: extractionQualityOf(args.credential),
    credentialClass: args.credential.credentialClass ?? null,
    fraudFlags: [...(args.identity.fraudFlags ?? []), ...(args.credential.fraudFlags ?? [])]
      .join(",")
      .trim() || null,
    analysisStatus: args.hybrid.analysisStatus,
    decision: args.hybrid.decision,
    decisionReason: args.hybrid.decisionReason,
    verificationMethod: args.hybrid.verificationMethod,
    reviewRequired: args.hybrid.reviewRequired,
  });

  return {
    verification: toVerificationFromCase(saved),
    reusedExisting: false,
    userVerified,
    eventWritten: true,
  };
}

function mapCase(row: {
  id: string;
  userId: string;
  name: string;
  profession: string;
  status: VerificationStatus;
  registeringBody: string | null;
  registrationNumber: string | null;
  matchOutcome: string | null;
  matchedRegistryId: string | null;
  documentCount: number;
  submittedAt: Date;
  createdAt: Date;
  flags: string[];
}): CaseRow {
  return row;
}

const currentCaseOrderBy = [
  desc(verifications.submittedAt),
  desc(verifications.createdAt),
  desc(verifications.id),
] as const;

export function createDrizzleWriteTx(
  db: ReturnType<typeof getDb>,
): VerificationWriteTx {
  return {
    acquireUserLock: async (userId) => {
      await acquireVerificationSubmitLock(db, userId);
    },
    lookupRegistry: (registeringBody, registrationNumber) =>
      findRegistryByRegistration(registeringBody, registrationNumber, db),
    findCurrentCase: async (userId) => {
      const rows = await db
        .select()
        .from(verifications)
        .where(eq(verifications.userId, userId))
        .orderBy(...currentCaseOrderBy)
        .limit(1);
      return rows[0] ? mapCase(rows[0]) : null;
    },
    getById: async (id) => {
      const rows = await db
        .select()
        .from(verifications)
        .where(eq(verifications.id, id))
        .limit(1);
      return rows[0] ? mapCase(rows[0]) : null;
    },
    insertCase: async (input) => {
      const rows = await db
        .insert(verifications)
        .values({
          userId: input.userId,
          name: input.name,
          profession: input.profession,
          registeringBody: input.registeringBody,
          registrationNumber: input.registrationNumber,
          status: input.status,
          matchOutcome: input.matchOutcome,
          matchedRegistryId: input.matchedRegistryId,
          submittedAt: new Date(),
        })
        .returning();
      const row = rows[0];
      if (!row) throw new Error("Failed to create verification case.");
      return mapCase(row);
    },
    updateCase: async (id, patch) => {
      const rows = await db
        .update(verifications)
        .set({
          name: patch.name,
          profession: patch.profession,
          registeringBody: patch.registeringBody,
          registrationNumber: patch.registrationNumber,
          status: patch.status,
          matchOutcome: patch.matchOutcome,
          matchedRegistryId: patch.matchedRegistryId,
          ...(patch.touchSubmittedAt ? { submittedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(verifications.id, id))
        .returning();
      const row = rows[0];
      if (!row) throw new Error("Failed to update verification case.");
      return mapCase(row);
    },
    setUserVerified: async (userId, verified) => {
      await db
        .update(users)
        .set({ verified, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },
    updateUserCredentials: async (userId, patch) => {
      await db
        .update(users)
        .set({
          profession: patch.profession,
          registeringBody: patch.registeringBody,
          registrationNumber: patch.registrationNumber,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },
    insertEvent: (event) => insertVerificationEvent(event, db),
    insertEvidence: async (row) => {
      try {
        await db.insert(verificationEvidence).values({
          verificationId: row.verificationId,
          userId: row.userId,
          identityDocumentId: row.identityDocumentId ?? null,
          credentialDocumentId: row.credentialDocumentId ?? null,
          identityName: row.identityName ?? null,
          identityDocumentType: row.identityDocumentType ?? null,
          credentialName: row.credentialName ?? null,
          credentialType: row.credentialType ?? null,
          detectedProfession: row.detectedProfession ?? null,
          registrationNumber: row.registrationNumber ?? null,
          issuingBody: row.issuingBody ?? null,
          issueDate: row.issueDate ?? null,
          expiryDate: row.expiryDate ?? null,
          nameMatch: row.nameMatch,
          professionMatch: row.professionMatch,
          expiryCheck: row.expiryCheck,
          registryAvailable: row.registryAvailable,
          registryNameMatch: row.registryNameMatch,
          registryProfessionMatch: row.registryProfessionMatch,
          registryOutcome: row.registryOutcome,
          documentQuality: row.documentQuality ?? null,
          identityQuality: row.identityQuality ?? null,
          credentialQuality: row.credentialQuality ?? null,
          credentialClass: row.credentialClass ?? null,
          fraudFlags: row.fraudFlags ?? null,
          analysisStatus: row.analysisStatus,
          decision: row.decision,
          decisionReason: row.decisionReason,
          verificationMethod: row.verificationMethod,
          reviewRequired: row.reviewRequired,
        });
      } catch {
        // 0012 may not be applied yet; the verification case is still stored.
      }
    },
    countOtherVerifiedCases: async (userId, exceptVerificationId) => {
      const rows = await db
        .select({ value: count() })
        .from(verifications)
        .where(
          and(
            eq(verifications.userId, userId),
            eq(verifications.status, "Verified"),
            ne(verifications.id, exceptVerificationId),
          ),
        );
      return Number(rows[0]?.value ?? 0);
    },
  };
}

async function assertOwnedProfessionalDocuments(
  userId: string,
  identityDocumentId: string,
  credentialDocumentId: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createUploadClient();
  const { data, error } = await supabase
    .from("professional_documents")
    .select("id")
    .eq("user_id", userId)
    .in("id", [identityDocumentId, credentialDocumentId]);
  if (error) {
    if (isMissingTableError(error)) return;
    throw new SubmitVerificationError(
      "invalid_documents",
      "Could not confirm uploaded documents.",
    );
  }
  const ids = new Set((data ?? []).map((row) => row.id as string));
  if (!ids.has(identityDocumentId) || !ids.has(credentialDocumentId)) {
    throw new SubmitVerificationError(
      "invalid_documents",
      "Identity and credential documents must belong to your account.",
    );
  }
}

export const defaultSubmitStore: SubmitVerificationStore = {
  hasDbConfig,
  assertOwnedDocuments: assertOwnedProfessionalDocuments,
  runInTransaction: async (fn) => {
    const db = getDb();
    return db.transaction((tx) =>
      fn(createDrizzleWriteTx(tx as ReturnType<typeof getDb>)),
    );
  },
};

export async function findLatestVerificationForUser(
  userId: string,
): Promise<Verification | null> {
  if (!hasDbConfig()) return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(verifications)
    .where(eq(verifications.userId, userId))
    .orderBy(...currentCaseOrderBy)
    .limit(1);
  return rows[0] ? toVerification(rows[0]) : null;
}
