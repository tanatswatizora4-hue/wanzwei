import { z } from "zod";

import { professionSupportsHpaAutoVerify } from "@/lib/professions";

export const REGULATORY_BODY_CODES = [
  "MDPCZ",
  "NCZ",
  "PCZ",
  "AHPCZ",
  "MLCSCZ",
  "EHPCZ",
  "MRPCZ",
  "NTCZ",
  "TMPC",
  "OTHER",
] as const;

export type RegulatoryBodyCode = (typeof REGULATORY_BODY_CODES)[number];

export type RegulatoryBodyOption = {
  code: RegulatoryBodyCode;
  label: string;
};

export const REGULATORY_BODIES: readonly RegulatoryBodyOption[] = [
  {
    code: "MDPCZ",
    label: "Medical and Dental Practitioners Council of Zimbabwe (MDPCZ)",
  },
  {
    code: "NCZ",
    label: "Nurses Council of Zimbabwe (NCZ)",
  },
  {
    code: "PCZ",
    label: "Pharmacists Council of Zimbabwe (PCZ)",
  },
  {
    code: "AHPCZ",
    label: "Allied Health Practitioners Council of Zimbabwe (AHPCZ)",
  },
  {
    code: "MLCSCZ",
    label:
      "Medical Laboratory and Clinical Scientists Council of Zimbabwe (MLCSCZ)",
  },
  {
    code: "EHPCZ",
    label: "Environmental Health Practitioners Council of Zimbabwe (EHPCZ)",
  },
  {
    code: "MRPCZ",
    label: "Medical Rehabilitation Practitioners Council of Zimbabwe (MRPCZ)",
  },
  {
    code: "NTCZ",
    label: "Natural Therapists Council of Zimbabwe (NTCZ)",
  },
  {
    code: "TMPC",
    label: "Traditional Medical Practitioners Council (TMPC)",
  },
  {
    code: "OTHER",
    label: "Other",
  },
] as const;

const LABEL_BY_CODE = new Map(
  REGULATORY_BODIES.map((entry) => [entry.code, entry.label] as const),
);

const CODE_BY_NORMALIZED = new Map<string, RegulatoryBodyCode>(
  REGULATORY_BODIES.flatMap((entry) => {
    const aliases = [entry.code, entry.label, entry.label.replace(/\s*\([^)]+\)\s*$/, "")];
    return aliases.map((alias) => [normalizeBodyText(alias), entry.code] as const);
  }),
);

export const LEGACY_HPA_BODY = "HPA";

function normalizeBodyText(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

export function isSelectableRegulatoryBody(
  value: string,
): value is RegulatoryBodyCode {
  return (REGULATORY_BODY_CODES as readonly string[]).includes(value.trim());
}

export function isOtherRegulatoryBody(value?: string | null): boolean {
  return parseSelectableRegulatoryBody(value) === "OTHER";
}

export function isLegacyHpaBody(value?: string | null): boolean {
  return normalizeBodyText(value ?? "") === LEGACY_HPA_BODY;
}

export function parseSelectableRegulatoryBody(
  value?: string | null,
): RegulatoryBodyCode | null {
  const normalized = normalizeBodyText(value ?? "");
  if (!normalized) return null;
  if (normalized === LEGACY_HPA_BODY) return null;
  return CODE_BY_NORMALIZED.get(normalized) ?? null;
}

export function displayRegulatoryBody(
  codeOrLegacy?: string | null,
  other?: string | null,
): string {
  const selectable = parseSelectableRegulatoryBody(codeOrLegacy);
  if (selectable === "OTHER") {
    const named = other?.trim();
    return named || "Other";
  }
  if (selectable) return LABEL_BY_CODE.get(selectable) ?? selectable;
  if (isLegacyHpaBody(codeOrLegacy)) {
    return "Legacy practitioner register";
  }
  return codeOrLegacy?.trim() || "Not provided";
}

/**
 * The imported practitioner_registry dump is keyed as HPA. It may
 * corroborate PCZ pharmacy and NCZ nursing/midwifery families only.
 * Other councils, and Other, are never treated as registry-corroborated.
 */
export function regulatoryBodySupportsHpaCorroboration(
  body: string | null | undefined,
  profession: string,
): boolean {
  const selectable = parseSelectableRegulatoryBody(body);
  if (!selectable || selectable === "OTHER") return false;
  if (!professionSupportsHpaAutoVerify(profession)) return false;
  if (selectable === "PCZ") {
    return profession === "Pharmacist" || profession === "Pharmacy Technician";
  }
  if (selectable === "NCZ") {
    return profession === "Nurse" || profession === "Midwife";
  }
  return false;
}

export function extractedRegulatoryBodyCompatible(
  claimed?: string | null,
  extracted?: string | null,
): boolean {
  const extractedCode = parseSelectableRegulatoryBody(extracted);
  if (!extractedCode) return true;
  const claimedCode = parseSelectableRegulatoryBody(claimed);
  if (!claimedCode) return true;
  return claimedCode === extractedCode;
}

export const RegulatoryBodySchema = z
  .string()
  .trim()
  .min(1, "Regulatory body is required")
  .refine((value) => isSelectableRegulatoryBody(value), {
    message: "Select a regulatory body from the list.",
  })
  .transform((value) => value as RegulatoryBodyCode);

export const RegulatoryBodyOtherSchema = z
  .string()
  .trim()
  .min(2, "Name of regulatory body is required")
  .max(160, "Name of regulatory body is too long");

export function requireRegulatoryBodyOther(
  body: string | null | undefined,
  other?: string | null,
): string | undefined {
  if (!isOtherRegulatoryBody(body)) return undefined;
  const named = other?.trim() ?? "";
  return named.length >= 2 ? named : undefined;
}
