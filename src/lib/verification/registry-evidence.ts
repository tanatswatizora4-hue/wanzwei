import { professionSupportsHpaAutoVerify } from "@/lib/professions";
import {
  classifyRegistryMatch,
  type RegistryMatchRecord,
} from "@/lib/registry/match";
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
  if (!registrationNumber) {
    return {
      outcome: professionSupportsHpaAutoVerify(input.submittedProfession)
        ? "NOT_SUBMITTED"
        : "UNAVAILABLE_FOR_PROFESSION",
      registryAvailable: professionSupportsHpaAutoVerify(input.submittedProfession),
      registryNameMatch: null,
      registryProfessionMatch: null,
      matchedRegistryId: null,
      reason: professionSupportsHpaAutoVerify(input.submittedProfession)
        ? "No registration number was submitted for registry lookup."
        : "No compatible HPA register family exists for this profession.",
    };
  }

  if (!professionSupportsHpaAutoVerify(input.submittedProfession)) {
    return {
      outcome: "UNAVAILABLE_FOR_PROFESSION",
      registryAvailable: false,
      registryNameMatch: null,
      registryProfessionMatch: null,
      matchedRegistryId: null,
      reason: "No compatible HPA register family exists for this profession.",
    };
  }

  if (input.lookupFailed) {
    return {
      outcome: "NOT_FOUND",
      registryAvailable: true,
      registryNameMatch: null,
      registryProfessionMatch: null,
      matchedRegistryId: null,
      reason: "Registry lookup failed.",
    };
  }

  const classified = classifyRegistryMatch({
    registeringBody: input.registeringBody ?? "HPA",
    registrationNumber,
    submittedName: input.submittedName,
    submittedProfession: input.submittedProfession,
    rows: input.rows,
  });

  if (classified.autoVerify && classified.outcome === "matched") {
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
    reason: classified.reason,
  };
}
