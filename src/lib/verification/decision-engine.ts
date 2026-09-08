import type { VerificationStatus } from "@/lib/types";
import {
  extractedRegulatoryBodyCompatible,
  isOtherRegulatoryBody,
} from "@/lib/regulatory-bodies";
import { classifyCredentialType } from "@/lib/verification/credential-class";
import type {
  AnalysisStatus,
  CredentialAnalysis,
  ExtractionQuality,
  HybridDecision,
  HybridDecisionInput,
  HybridDecisionResult,
  IdentityAnalysis,
  NameMatch,
  ProfessionMatch,
} from "@/lib/verification/hybrid-types";
import { namesAreCompatible } from "@/lib/verification/name-match";
import {
  extractedProfessionCompatible,
  professionRequiresCurrentAuthorization,
} from "@/lib/verification/profession-map";
import { derivePractisingCertificateStatus } from "@/lib/verification/practising-certificate";

const QUALITY_AUTO_VERIFY: ExtractionQuality[] = ["high"];
const CONFIDENCE_QUALITY_FLOOR = 0.7;

function nameMatchFor(input: HybridDecisionInput): NameMatch {
  const submitted = input.submittedName;
  const identityName = composeIdentityName(input.identity);
  const credentialName = input.credential.credentialName;
  const known = [identityName, credentialName].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  if (known.length === 0) return "unknown";
  const identityOk =
    !identityName?.trim() || namesAreCompatible(submitted, identityName);
  const credentialOk =
    !credentialName?.trim() || namesAreCompatible(submitted, credentialName);
  const crossOk =
    !identityName?.trim() ||
    !credentialName?.trim() ||
    namesAreCompatible(identityName, credentialName);
  return identityOk && credentialOk && crossOk ? "match" : "mismatch";
}

function composeIdentityName(identity: IdentityAnalysis): string | null {
  if (identity.identityName?.trim()) return identity.identityName;
  const parts = [identity.givenNames, identity.surname]
    .map((value) => value?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export function mapHybridDecisionToVerificationStatus(
  decision: HybridDecision,
): VerificationStatus {
  switch (decision) {
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "pending_documents":
      return "Pending";
    default:
      return "Under Review";
  }
}

function analysisStatusFor(input: HybridDecisionInput): AnalysisStatus {
  if (
    input.identity.status === "unavailable" ||
    input.credential.status === "unavailable"
  ) {
    return "unavailable";
  }
  if (
    input.identity.status === "unreadable" ||
    input.credential.status === "unreadable"
  ) {
    return "unreadable";
  }
  return "processed";
}

export function extractionQualityOf(
  analysis: IdentityAnalysis | CredentialAnalysis,
): ExtractionQuality {
  if (analysis.extractionQuality) return analysis.extractionQuality;
  if (
    typeof analysis.confidence === "number" &&
    analysis.confidence < CONFIDENCE_QUALITY_FLOOR
  ) {
    return "poor";
  }
  if (analysis.documentQuality === "readable") return "high";
  if (analysis.documentQuality === "poor") return "poor";
  return "unknown";
}

function qualityAllowsAutoVerify(
  analysis: IdentityAnalysis | CredentialAnalysis,
): boolean {
  if (
    typeof analysis.confidence === "number" &&
    analysis.confidence < CONFIDENCE_QUALITY_FLOOR
  ) {
    return false;
  }
  return QUALITY_AUTO_VERIFY.includes(extractionQualityOf(analysis));
}

function credentialClassOf(credential: CredentialAnalysis) {
  return credential.credentialClass ?? classifyCredentialType(credential.credentialType);
}

function expiryCheckFor(
  credential: CredentialAnalysis,
): HybridDecisionResult["expiryCheck"] {
  const status = derivePractisingCertificateStatus(credential.expiryDate);
  if (status === "expired") return "expired";
  if (status === "current") return "current";
  return "unknown";
}

function result(
  partial: Omit<
    HybridDecisionResult,
    "nameMatch" | "professionMatch" | "expiryCheck" | "analysisStatus"
  > &
    Partial<
      Pick<
        HybridDecisionResult,
        "nameMatch" | "professionMatch" | "expiryCheck" | "analysisStatus"
      >
    >,
  computed: {
    nameMatch: NameMatch;
    professionMatch: HybridDecisionResult["professionMatch"];
    expiryCheck: HybridDecisionResult["expiryCheck"];
    analysisStatus: AnalysisStatus;
  },
): HybridDecisionResult {
  return {
    ...computed,
    ...partial,
    nameMatch: partial.nameMatch ?? computed.nameMatch,
    professionMatch: partial.professionMatch ?? computed.professionMatch,
    expiryCheck: partial.expiryCheck ?? computed.expiryCheck,
    analysisStatus: partial.analysisStatus ?? computed.analysisStatus,
  };
}

/**
 * Server-side only. Model confidence is never a verification grant.
 * Registry MATCH is corroboration when an authoritative source exists.
 * Gemini extraction never sets users.verified.
 */
export function decideHybridVerification(
  input: HybridDecisionInput,
): HybridDecisionResult {
  if (!input.hasIdentityDocument || !input.hasCredentialDocument) {
    return {
      decision: "pending_documents",
      decisionReason: "Identity and professional credential documents are required.",
      verificationMethod: "hybrid",
      reviewRequired: true,
      nameMatch: "unknown",
      professionMatch: "unknown",
      expiryCheck: "unknown",
      analysisStatus: "unavailable",
    };
  }

  const analysisStatus = analysisStatusFor(input);
  const nameMatch = nameMatchFor(input);
  const detectedProfession = input.credential.detectedProfession;
  const professionMatch: ProfessionMatch = detectedProfession?.trim()
    ? extractedProfessionCompatible(input.submittedProfession, detectedProfession)
      ? "compatible"
      : "incompatible"
    : "unknown";
  const expiryCheck = expiryCheckFor(input.credential);
  const computed = { nameMatch, professionMatch, expiryCheck, analysisStatus };
  const credentialClass = credentialClassOf(input.credential);
  const requiresCurrentAuth = professionRequiresCurrentAuthorization(
    input.submittedProfession,
  );
  const otherBody = isOtherRegulatoryBody(input.submittedRegulatoryBody);
  const bodyCompatible = extractedRegulatoryBodyCompatible(
    input.submittedRegulatoryBody,
    input.credential.issuingBody,
  );
  const fraud =
    (input.identity.fraudFlags?.length ?? 0) > 0 ||
    (input.credential.fraudFlags?.length ?? 0) > 0;

  if (input.registry.outcome === "CONTRADICTION") {
    return result(
      {
        decision: "manual_review",
        decisionReason: input.registry.reason,
        verificationMethod: "registry_assisted",
        reviewRequired: true,
        professionMatch:
          input.registry.registryProfessionMatch === false
            ? "incompatible"
            : professionMatch,
      },
      computed,
    );
  }

  if (
    fraud ||
    nameMatch === "mismatch" ||
    professionMatch === "incompatible" ||
    !bodyCompatible
  ) {
    return result(
      {
        decision: "manual_review",
        decisionReason: fraud
          ? "Document analysis reported a fraud, tamper, or contradiction flag."
          : nameMatch === "mismatch"
            ? "Identity and credential names do not match."
            : !bodyCompatible
              ? "Extracted regulatory body does not match the claimed council."
            : "Detected profession is not compatible with the submitted profession.",
        verificationMethod: "hybrid",
        reviewRequired: true,
      },
      computed,
    );
  }

  if (analysisStatus === "unavailable") {
    return result(
      {
        decision: "processing",
        decisionReason:
          "Document analysis is not configured or the provider failed. Credentials were stored for review and are not auto-verified.",
        verificationMethod: "hybrid",
        reviewRequired: true,
      },
      computed,
    );
  }

  if (analysisStatus === "unreadable") {
    return result(
      {
        decision: "additional_evidence_required",
        decisionReason:
          "Uploaded documents could not be read. Please provide clearer copies.",
        verificationMethod: "hybrid",
        reviewRequired: true,
      },
      computed,
    );
  }

  if (expiryCheck === "expired" && (requiresCurrentAuth || credentialClass === "current_authorization")) {
    return result(
      {
        decision: "additional_evidence_required",
        decisionReason:
          "The practising certificate appears expired. A current practising certificate is required.",
        verificationMethod: "hybrid",
        reviewRequired: true,
      },
      computed,
    );
  }

  if (otherBody) {
    return result(
      {
        decision: "manual_review",
        decisionReason:
          "Other regulatory bodies cannot be auto-verified. Admin review is required.",
        verificationMethod: "manual",
        reviewRequired: true,
      },
      computed,
    );
  }

  const identityReady = Boolean(composeIdentityName(input.identity)?.trim());
  const credentialReady = Boolean(input.credential.credentialName?.trim());
  const qualityOk =
    qualityAllowsAutoVerify(input.identity) &&
    qualityAllowsAutoVerify(input.credential);
  const currentAuthOk = !requiresCurrentAuth
    ? true
    : credentialClass === "current_authorization" &&
      (expiryCheck === "current" ||
        (input.registry.outcome === "MATCH" && expiryCheck !== "expired"));

  if (input.registry.outcome === "MATCH") {
    if (
      nameMatch === "match" &&
      identityReady &&
      credentialReady &&
      qualityOk &&
      currentAuthOk &&
      (professionMatch === "compatible" || professionMatch === "unknown")
    ) {
      return result(
        {
          decision: "verified",
          decisionReason:
            "Identity and credential documents were readable and an authoritative registry record corroborated the registration.",
          verificationMethod: "registry_assisted",
          reviewRequired: false,
          professionMatch:
            professionMatch === "unknown" ? "compatible" : professionMatch,
          expiryCheck: expiryCheck === "unknown" ? "current" : expiryCheck,
        },
        computed,
      );
    }
    return result(
      {
        decision: "manual_review",
        decisionReason:
          "Registry corroboration was found, but document evidence still requires review.",
        verificationMethod: "registry_assisted",
        reviewRequired: true,
      },
      computed,
    );
  }

  if (input.registry.outcome === "NOT_FOUND") {
    return result(
      {
        decision: "manual_review",
        decisionReason:
          "Wanzwei could not automatically corroborate this registration. Documents will be reviewed.",
        verificationMethod: "registry_assisted",
        reviewRequired: true,
      },
      computed,
    );
  }

  if (input.registry.outcome === "NOT_SUBMITTED") {
    return result(
      {
        decision: "additional_evidence_required",
        decisionReason:
          "A professional registration number is required for this regulatory body.",
        verificationMethod: "registry_assisted",
        reviewRequired: true,
      },
      computed,
    );
  }

  const nonRegistryReady =
    nameMatch === "match" &&
    professionMatch === "compatible" &&
    identityReady &&
    credentialReady &&
    Boolean(input.credential.credentialType?.trim()) &&
    qualityOk &&
    currentAuthOk &&
    !fraud;

  if (nonRegistryReady) {
    return result(
      {
        decision: "manual_review",
        decisionReason:
          "Identity and credential documents are internally consistent. Wanzwei has no authoritative registry integration for this regulatory body, so admin review is required.",
        verificationMethod: "hybrid",
        reviewRequired: true,
      },
      computed,
    );
  }

  if (!identityReady || !credentialReady || !qualityOk || !currentAuthOk) {
    return result(
      {
        decision: "additional_evidence_required",
        decisionReason: !currentAuthOk
          ? "A current practising certificate or professional licence is required for this profession. A degree alone is not sufficient."
          : !qualityOk || !identityReady || !credentialReady
            ? "Document extraction was incomplete or below the quality threshold. Please upload clearer copies."
            : "Additional verification evidence is required.",
        verificationMethod: "hybrid",
        reviewRequired: true,
      },
      computed,
    );
  }

  return result(
    {
      decision: "manual_review",
      decisionReason:
        "Document evidence is insufficient for automatic verification. Manual review is required.",
      verificationMethod: "hybrid",
      reviewRequired: true,
    },
    computed,
  );
}
