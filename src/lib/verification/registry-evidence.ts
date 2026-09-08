import { professionSupportsHpaAutoVerify } from "@/lib/professions";
import { HPA_BODY, classifyRegistryMatch, type RegistryMatchRecord } from "@/lib/registry/match";
import {
  isOtherRegulatoryBody,
  regulatoryBodySupportsHpaCorroboration,
} from "@/lib/regulatory-bodies";
import type { RegistryEvidence } from "@/lib/verification/hybrid-types";

export function registryEvidenceFromMatch(input: {
  submittedName: string;
  submittedProfession: string;
  registeringBody?: string | null;
  registrationNumber?: string | null;
  rows: RegistryMatchRecord[];
  lookupFailed?: boolean;
}): RegistryEvidence {
  const registrationNumber = input.registrationNumber?.trim() ?? "";
  const registryAvailable = regulatoryBodySupportsHpaCorroboration(
    input.registeringBody,
    input.submittedProfession,
  );

  if (isOtherRegulatoryBody(input.registeringBody)) {
    return {
      outcome: "UNAVAILABLE_FOR_PROFESSION",
      registryAvailable: false,
      registryNameMatch: null,
      registryProfessionMatch: null,
      matchedRegistryId: null,
      reason:
        "Other regulatory bodies are never treated as registry corroborated.",
    };
  }

  if (!registryAvailable) {
    return {
      outcome: "UNAVAILABLE_FOR_PROFESSION",
      registryAvailable: false,
      registryNameMatch: null,
      registryProfessionMatch: null,
      matchedRegistryId: null,
      reason: professionSupportsHpaAutoVerify(input.submittedProfession)
        ? "Wanzwei has no authoritative registry integration for this regulatory body."
        : "No compatible practitioner register exists for this profession.",
    };
  }

  if (!registrationNumber) {
    return {
      outcome: "NOT_SUBMITTED",
      registryAvailable: true,
      registryNameMatch: null,
      registryProfessionMatch: null,
      matchedRegistryId: null,
      reason: "No registration number was submitted for registry lookup.",
    };
  }

  if (input.lookupFailed) {
    return {
      outcome: "NOT_FOUND",
      registryAvailable: true,
      registryNameMatch: null,
      registryProfessionMatch: null,
      matchedRegistryId: null,
      reason: "Wanzwei could not automatically corroborate this registration.",
    };
  }

  const classified = classifyRegistryMatch({
    registeringBody: HPA_BODY,
    registrationNumber,
    submittedName: input.submittedName,
    submittedProfession: input.submittedProfession,
    rows: input.rows,
  });

  if (classified.autoVerify && classified.outcome === "matched") {
    const placeholder = input.rows.some((row) => row.isPlaceholder);
    if (placeholder) {
      return {
        outcome: "NOT_FOUND",
        registryAvailable: true,
        registryNameMatch: null,
        registryProfessionMatch: null,
        matchedRegistryId: classified.matchedRegistryId,
        reason:
          "Placeholder or invalid registry records cannot be used to corroborate registration.",
      };
    }
    return {
      outcome: "MATCH",
      registryAvailable: true,
      registryNameMatch: true,
      registryProfessionMatch: true,
      matchedRegistryId: classified.matchedRegistryId,
      reason: classified.reason,
    };
  }

  if (
    classified.outcome === "name_mismatch" ||
    classified.outcome === "profession_mismatch" ||
    classified.outcome === "non_clinical_qualification" ||
    classified.outcome === "expired"
  ) {
    return {
      outcome: "CONTRADICTION",
      registryAvailable: true,
      registryNameMatch: classified.outcome !== "name_mismatch",
      registryProfessionMatch: classified.outcome !== "profession_mismatch",
      matchedRegistryId: classified.matchedRegistryId,
      reason: classified.reason,
    };
  }

  return {
    outcome: "NOT_FOUND",
    registryAvailable: true,
    registryNameMatch: null,
    registryProfessionMatch: null,
    matchedRegistryId: classified.matchedRegistryId,
    reason:
      classified.reason.includes("Placeholder") ||
      classified.outcome === "ambiguous" ||
      classified.outcome === "not_found"
        ? "Wanzwei could not automatically corroborate this registration."
        : classified.reason,
  };
}
