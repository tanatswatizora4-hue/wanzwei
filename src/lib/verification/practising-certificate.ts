export const PRACTISING_CERTIFICATE_STATUSES = [
  "current",
  "expired",
  "pending_review",
  "unable_to_confirm",
] as const;

export type PractisingCertificateStatus =
  (typeof PRACTISING_CERTIFICATE_STATUSES)[number];

export const IDENTITY_VERIFICATION_STATUSES = [
  "pending",
  "processed",
  "unreadable",
  "unavailable",
  "reviewed",
] as const;

export type IdentityVerificationStatus =
  (typeof IDENTITY_VERIFICATION_STATUSES)[number];

export const CREDENTIAL_STATUSES = [
  "pending_review",
  "reviewed",
  "insufficient",
] as const;

export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export const CREDENTIAL_VERIFICATION_METHODS = [
  "hybrid",
  "registry_assisted",
  "manual",
] as const;

export type CredentialVerificationMethod =
  (typeof CREDENTIAL_VERIFICATION_METHODS)[number];

export function parseIsoDateOnly(
  value?: string | Date | null,
): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoDay) {
    const parsed = new Date(
      Date.UTC(
        Number(isoDay[1]),
        Number(isoDay[2]) - 1,
        Number(isoDay[3]),
      ),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

export function formatIsoDateOnly(value?: string | Date | null): string | null {
  const parsed = parseIsoDateOnly(value);
  if (!parsed) return null;
  return parsed.toISOString().slice(0, 10);
}

/**
 * Deterministic practising-certificate currency from a stored expiry date.
 * Missing/unparseable dates are unable_to_confirm — never invented as current.
 */
export function derivePractisingCertificateStatus(
  expiry?: string | Date | null,
  asOf: Date = new Date(),
): PractisingCertificateStatus {
  const parsed = parseIsoDateOnly(expiry);
  if (!parsed) return "unable_to_confirm";
  const asOfDay = Date.UTC(
    asOf.getUTCFullYear(),
    asOf.getUTCMonth(),
    asOf.getUTCDate(),
  );
  const expiryDay = Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
  );
  return expiryDay < asOfDay ? "expired" : "current";
}

export function displayPractisingCertificateStatus(
  status: PractisingCertificateStatus,
): string {
  switch (status) {
    case "current":
      return "Current";
    case "expired":
      return "Expired";
    case "pending_review":
      return "Pending review";
    default:
      return "Unable to confirm";
  }
}

/**
 * Legacy verified professionals may have null expiry fields. Do not treat
 * that as expired, and do not flip users.verified. Certificate currency is
 * unable_to_confirm until they submit/review new evidence.
 */
export function practisingCertificateStatusForAccount(input: {
  verified?: boolean;
  practisingCertificateExpiry?: string | Date | null;
  practisingCertificateStatus?: string | null;
  asOf?: Date;
}): PractisingCertificateStatus {
  const derived = derivePractisingCertificateStatus(
    input.practisingCertificateExpiry,
    input.asOf,
  );
  if (derived === "expired") return "expired";
  if (derived === "current") return "current";
  if (input.practisingCertificateStatus === "pending_review") {
    return "pending_review";
  }
  return "unable_to_confirm";
}

export function legacyVerifiedAccountRemainsVerified(input: {
  verified: boolean;
  practisingCertificateExpiry?: string | Date | null;
  practisingCertificateStatus?: string | null;
}): boolean {
  return input.verified === true;
}
