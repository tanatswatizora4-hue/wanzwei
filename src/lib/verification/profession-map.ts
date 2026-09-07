import {
  PROFESSION_CATEGORIES,
  PROFESSION_LABELS,
  professionSupportsHpaAutoVerify,
} from "@/lib/professions";
import { professionsCompatible } from "@/lib/registry/match";
import { normalizeQualification } from "@/lib/registry/persons-register";

const CURRENT_AUTHORIZATION_CATEGORIES = new Set([
  "direct_patient_care",
  "laboratory_and_diagnostic",
  "allied_health",
  "pharmaceutical_supply_chain",
]);

const EXTRACTED_PROFESSION_ALIASES: Record<string, string> = {
  GP: "Medical Doctor (General Practitioner)",
  "GENERAL PRACTITIONER": "Medical Doctor (General Practitioner)",
  "MEDICAL DOCTOR": "Medical Doctor (General Practitioner)",
  RN: "Nurse",
  "REGISTERED NURSE": "Nurse",
  "PHARM TECH": "Pharmacy Technician",
  "PHARMACY TECH": "Pharmacy Technician",
};

const CANONICAL_BY_NORMALIZED = new Map(
  PROFESSION_LABELS.map((label) => [normalizeQualification(label), label]),
);

export function mapExtractedProfession(raw?: string | null): string | null {
  const normalized = normalizeQualification(raw ?? "");
  if (!normalized) return null;
  const alias = EXTRACTED_PROFESSION_ALIASES[normalized];
  if (alias) return alias;
  return CANONICAL_BY_NORMALIZED.get(normalized) ?? null;
}

export function extractedProfessionCompatible(
  submittedProfession: string,
  detectedProfession?: string | null,
): boolean {
  const detected = detectedProfession?.trim() ?? "";
  if (!detected) return false;
  if (professionsCompatible(submittedProfession, detected)) return true;
  const submitted = normalizeQualification(submittedProfession);
  const mapped = mapExtractedProfession(detected);
  if (mapped && normalizeQualification(mapped) === submitted) return true;
  return submitted === normalizeQualification(detected);
}

export function professionRequiresCurrentAuthorization(
  profession: string,
): boolean {
  const trimmed = profession.trim();
  if (professionSupportsHpaAutoVerify(trimmed)) return true;
  const category = PROFESSION_CATEGORIES.find((entry) =>
    entry.professions.includes(trimmed),
  );
  return Boolean(
    category && CURRENT_AUTHORIZATION_CATEGORIES.has(category.id),
  );
}
