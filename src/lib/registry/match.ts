import type { VerificationMatchOutcome, VerificationStatus } from "@/lib/types";
import {
  deriveStatus,
  isPlaceholderPersonNumber,
  isPlaceholderRegistration,
  normalizePersonName,
  normalizeQualification,
  normalizeRegistrationNumber,
  parseNormalizedPersonNumber,
} from "@/lib/registry/persons-register";

export const HPA_BODY = "HPA";

const NON_CLINICAL_QUALIFICATIONS = new Set(["SALES REPRESENTATIVE"]);

/**
 * Conservative auto-verify families. Only exact membership in the same
 * group is compatible. Unknown titles never auto-qualify, including when
 * the submitted string equals the registry string.
 */
export const PROFESSION_FAMILIES: readonly string[][] = [
  ["PHARMACIST"],
  ["PHARMACY TECHNICIAN", "PHARM TECH", "PHARMACY TECH"],
  ["IND CLINIC NURSE", "INDEPENDENT CLINIC NURSE"],
  ["REGISTERED NURSE", "RN"],
  ["MIDWIFE"],
];

export type RegistryMatchRecord = {
  id: string;
  registeringBody: string;
  registrationNumberNormalized: string;
  fullNameNormalized: string;
  qualification: string;
  qualificationNormalized: string;
  expiryDate: string;
  isPlaceholder: boolean;
  licenceClass: string;
  licenceSerial: string;
};

export type RegistryMatchInput = {
  registeringBody: string;
  registrationNumber: string;
  submittedName: string;
  submittedProfession: string;
  rows: RegistryMatchRecord[];
  asOf?: Date;
};

export type RegistryMatchResult = {
  outcome: VerificationMatchOutcome;
  autoVerify: boolean;
  matchedRegistryId: string | null;
  reason: string;
};

export function normalizeRegisteringBody(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isSupportedRegisteringBody(raw: string): boolean {
  return normalizeRegisteringBody(raw) === HPA_BODY;
}

export function statusForMatchOutcome(
  outcome: VerificationMatchOutcome,
  autoVerify: boolean,
): VerificationStatus {
  if (autoVerify && outcome === "matched") return "Verified";
  if (outcome === "missing_registration_number") return "Under Review";
  return "Under Review";
}

export function classifyRegistryMatch(
  input: RegistryMatchInput,
): RegistryMatchResult {
  const registrationNumber = input.registrationNumber.trim();
  if (!registrationNumber) {
    return {
      outcome: "missing_registration_number",
      autoVerify: false,
      matchedRegistryId: null,
      reason: "Registration number is missing.",
    };
  }

  if (input.rows.length === 0) {
    return {
      outcome: "not_found",
      autoVerify: false,
      matchedRegistryId: null,
      reason: "No registry record matched this registration number.",
    };
  }

  if (input.rows.length > 1) {
    return {
      outcome: "ambiguous",
      autoVerify: false,
      matchedRegistryId: null,
      reason: "Multiple registry records share this registration number.",
    };
  }

  const row = input.rows[0]!;
  const placeholder =
    row.isPlaceholder ||
    isPlaceholderRegistration(row.licenceClass, row.licenceSerial) ||
    isPlaceholderPersonNumber(row.registrationNumberNormalized) ||
    isPlaceholderPersonNumber(input.registrationNumber);

  if (placeholder) {
    return {
      outcome: "ambiguous",
      autoVerify: false,
      matchedRegistryId: row.id,
      reason: "Placeholder registration numbers cannot be auto-verified.",
    };
  }

  if (deriveStatus(row.expiryDate, input.asOf) === "expired") {
    return {
      outcome: "expired",
      autoVerify: false,
      matchedRegistryId: row.id,
      reason: "The matched registration has expired.",
    };
  }

  const qualification = row.qualificationNormalized || normalizeQualification(row.qualification);
  if (NON_CLINICAL_QUALIFICATIONS.has(qualification)) {
    return {
      outcome: "non_clinical_qualification",
      autoVerify: false,
      matchedRegistryId: row.id,
      reason: "The registry qualification is not eligible for professional verification.",
    };
  }

  if (!professionsCompatible(input.submittedProfession, qualification)) {
    return {
      outcome: "profession_mismatch",
      autoVerify: false,
      matchedRegistryId: row.id,
      reason: "Submitted profession does not match the registry qualification.",
    };
  }

  const submittedName = normalizePersonName(input.submittedName);
  if (!submittedName || submittedName !== row.fullNameNormalized) {
    return {
      outcome: "name_mismatch",
      autoVerify: false,
      matchedRegistryId: row.id,
      reason: "Submitted name does not match the registry record.",
    };
  }

  return {
    outcome: "matched",
    autoVerify: true,
    matchedRegistryId: row.id,
    reason: "Active unique HPA registration matched.",
  };
}

export function professionsCompatible(
  submittedProfession: string,
  registryQualificationNormalized: string,
): boolean {
  const submitted = normalizeQualification(submittedProfession);
  const registry = normalizeQualification(registryQualificationNormalized);
  if (!submitted || !registry) return false;

  const submittedFamily = professionFamily(submitted);
  const registryFamily = professionFamily(registry);
  if (submittedFamily && registryFamily) {
    return submittedFamily === registryFamily;
  }

  return false;
}

function professionFamily(normalized: string): string | null {
  for (const group of PROFESSION_FAMILIES) {
    if (group.includes(normalized)) return group[0]!;
  }
  return null;
}

export function parsedRegistrationOrNull(raw: string) {
  return parseNormalizedPersonNumber(raw);
}

export { normalizeRegistrationNumber, normalizePersonName, normalizeQualification };
