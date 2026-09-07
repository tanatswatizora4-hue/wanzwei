import { classifyCredentialType } from "@/lib/verification/credential-class";
import type {
  CredentialAnalysis,
  ExtractionQuality,
  IdentityAnalysis,
} from "@/lib/verification/hybrid-types";

const IDENTITY_NUMBER_KEYS = /(passport|national.?id|identity.?number|id.?number|nid|dob|date.?of.?birth)/i;

export const IDENTITY_EXTRACT_PROMPT = `You extract fields from a government identity document for a healthcare staffing platform in Zimbabwe.
Return JSON only. You are not a verification authority. Never return verified=true or any verification decision.
Never return national ID numbers, passport numbers, or dates of birth. Use boolean presence flags instead.
Fields:
documentType: national_id | passport | other | unknown
fullName, givenNames, surname, nationality, issueDate, expiryDate, issuingAuthority
identityNumberPresent: boolean
dateOfBirthPresent: boolean
readability: readable | poor | unreadable
extractionQuality: high | medium | poor
confidence: number between 0 and 1
uncertaintyFlags: string[] of short labels only (no identity numbers)`;

export const CREDENTIAL_EXTRACT_PROMPT = `You extract fields from a professional credential for a healthcare staffing platform in Zimbabwe.
Return JSON only. You are not a verification authority. Never return verified=true or any verification decision.
Distinguish current practising/licensing documents from academic qualifications/degrees.
Fields:
credentialType: practising_certificate | professional_licence | registration_certificate | qualification | degree | diploma | other
holderName, profession, qualification, institution, registrationNumber, issuingBody, issueDate, expiryDate, currentStatus
readability: readable | poor | unreadable
extractionQuality: high | medium | poor
confidence: number between 0 and 1
uncertaintyFlags: string[] of short labels only`;

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asConfidence(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value < 0 || value > 1) return null;
  return value;
}

function asQuality(value: unknown): ExtractionQuality | undefined {
  return value === "high" || value === "medium" || value === "poor"
    ? value
    : undefined;
}

function asReadability(value: unknown): "readable" | "poor" | "unknown" {
  if (value === "readable" || value === "poor") return value;
  return "unknown";
}

function asFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item && !IDENTITY_NUMBER_KEYS.test(item))
    .slice(0, 8);
}

function stripSensitiveKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSensitiveKeys);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (IDENTITY_NUMBER_KEYS.test(key)) continue;
    result[key] = stripSensitiveKeys(nested);
  }
  return result;
}

export function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return stripSensitiveKeys(parsed) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function identityType(
  value: unknown,
): IdentityAnalysis["identityDocumentType"] {
  if (value === "national_id" || value === "passport" || value === "unknown") {
    return value;
  }
  if (value === "other") return "unknown";
  return "unknown";
}

export function mapIdentityExtraction(
  raw: Record<string, unknown>,
): IdentityAnalysis {
  if (raw.readability === "unreadable") {
    return { status: "unreadable", documentQuality: "poor", extractionQuality: "poor" };
  }
  const composedName = [asString(raw.givenNames), asString(raw.surname)]
    .filter(Boolean)
    .join(" ");
  const fullName = asString(raw.fullName) ?? (composedName || null);
  return {
    status: "processed",
    identityName: fullName,
    givenNames: asString(raw.givenNames),
    surname: asString(raw.surname),
    identityDocumentType: identityType(raw.documentType),
    nationality: asString(raw.nationality),
    issueDate: asString(raw.issueDate),
    expiryDate: asString(raw.expiryDate),
    issuingAuthority: asString(raw.issuingAuthority),
    identityNumberPresent: asBoolean(raw.identityNumberPresent),
    documentQuality: asReadability(raw.readability),
    extractionQuality: asQuality(raw.extractionQuality),
    confidence: asConfidence(raw.confidence),
    fraudFlags: asFlags(raw.uncertaintyFlags),
  };
}

export function mapCredentialExtraction(
  raw: Record<string, unknown>,
): CredentialAnalysis {
  if (raw.readability === "unreadable") {
    return { status: "unreadable", documentQuality: "poor", extractionQuality: "poor" };
  }
  const credentialType = asString(raw.credentialType);
  return {
    status: "processed",
    credentialName: asString(raw.holderName) ?? asString(raw.fullName),
    credentialType,
    credentialClass: classifyCredentialType(credentialType),
    detectedProfession: asString(raw.profession),
    qualification: asString(raw.qualification),
    institution: asString(raw.institution),
    registrationNumber: asString(raw.registrationNumber),
    issuingBody: asString(raw.issuingBody),
    issueDate: asString(raw.issueDate),
    expiryDate: asString(raw.expiryDate),
    currentStatus: asString(raw.currentStatus),
    documentQuality: asReadability(raw.readability),
    extractionQuality: asQuality(raw.extractionQuality),
    confidence: asConfidence(raw.confidence),
    fraudFlags: asFlags(raw.uncertaintyFlags),
  };
}
