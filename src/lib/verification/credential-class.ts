import type { CredentialClass } from "@/lib/verification/hybrid-types";

const CURRENT_AUTHORIZATION_TYPES = new Set([
  "practising_certificate",
  "practicing_certificate",
  "professional_licence",
  "professional_license",
  "licence",
  "license",
  "registration_certificate",
  "registration",
]);

const QUALIFICATION_TYPES = new Set([
  "qualification",
  "qualification_certificate",
  "degree",
  "diploma",
  "certificate",
  "academic_certificate",
]);

export function classifyCredentialType(
  raw?: string | null,
): CredentialClass {
  const normalized = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!normalized) return "unknown";
  if (CURRENT_AUTHORIZATION_TYPES.has(normalized)) {
    return "current_authorization";
  }
  if (QUALIFICATION_TYPES.has(normalized)) return "qualification";
  if (normalized.includes("practis") || normalized.includes("practic")) {
    return "current_authorization";
  }
  if (normalized.includes("licen") || normalized.includes("regist")) {
    return "current_authorization";
  }
  if (
    normalized.includes("degree") ||
    normalized.includes("diploma") ||
    normalized.includes("bachelor") ||
    normalized.includes("master")
  ) {
    return "qualification";
  }
  return "unknown";
}
