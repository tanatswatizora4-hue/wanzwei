import { displayRegulatoryBody } from "@/lib/regulatory-bodies";
import {
  displayPractisingCertificateStatus,
  formatIsoDateOnly,
  practisingCertificateStatusForAccount,
  type CredentialVerificationMethod,
  type PractisingCertificateStatus,
} from "@/lib/verification/practising-certificate";

export type PublicCredentialLabel =
  | "Registry Verified"
  | "Credentials Reviewed"
  | "Not verified";

export type PublicCredentialSummary = {
  label: PublicCredentialLabel;
  regulatoryBody: string;
  registrationNumber: string | null;
  practisingCertificateStatus: PractisingCertificateStatus;
  practisingCertificateLabel: string;
  validUntil: string | null;
  lastReviewed: string | null;
};

export function publicCredentialLabel(input: {
  verified?: boolean;
  credentialVerificationMethod?: string | null;
}): PublicCredentialLabel {
  if (!input.verified) return "Not verified";
  if (input.credentialVerificationMethod === "registry_assisted") {
    return "Registry Verified";
  }
  return "Credentials Reviewed";
}

export function publicCredentialSummary(input: {
  verified?: boolean;
  registeringBody?: string | null;
  regulatoryBodyOther?: string | null;
  registrationNumber?: string | null;
  practisingCertificateExpiry?: string | Date | null;
  practisingCertificateStatus?: string | null;
  credentialVerificationMethod?: string | null;
  lastVerificationReviewAt?: string | Date | null;
  asOf?: Date;
}): PublicCredentialSummary {
  const certStatus = practisingCertificateStatusForAccount(input);
  const lastReviewed =
    input.lastVerificationReviewAt instanceof Date
      ? input.lastVerificationReviewAt.toISOString()
      : input.lastVerificationReviewAt?.trim() || null;
  return {
    label: publicCredentialLabel(input),
    regulatoryBody: displayRegulatoryBody(
      input.registeringBody,
      input.regulatoryBodyOther,
    ),
    registrationNumber: input.registrationNumber?.trim() || null,
    practisingCertificateStatus: certStatus,
    practisingCertificateLabel: displayPractisingCertificateStatus(certStatus),
    validUntil: formatIsoDateOnly(input.practisingCertificateExpiry),
    lastReviewed,
  };
}

export function isRegistryAssistedMethod(
  method?: string | null,
): method is CredentialVerificationMethod {
  return method === "registry_assisted";
}
