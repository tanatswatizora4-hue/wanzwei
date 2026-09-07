export const PROFESSIONAL_DOCUMENT_PURPOSES = [
  "identity",
  "credential",
  "supporting",
] as const;

export type ProfessionalDocumentPurpose =
  (typeof PROFESSIONAL_DOCUMENT_PURPOSES)[number];

export function parseProfessionalDocumentPurpose(
  value: unknown,
): ProfessionalDocumentPurpose | null {
  if (
    value === "identity" ||
    value === "credential" ||
    value === "supporting"
  ) {
    return value;
  }
  return null;
}

export function isSensitiveVerificationDocument(
  purpose: string | null | undefined,
): boolean {
  return purpose === "identity" || purpose === "credential";
}
