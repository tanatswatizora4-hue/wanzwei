import {
  BROADCAST_TYPE_LABELS,
  EMPTY_TARGETING_CRITERIA,
  NETWORK_RELATIONSHIP_LABELS,
  type BroadcastType,
  type TargetingCriteria,
  type TargetingSummary,
} from "@/lib/broadcasts/network-types";
import { TargetingCriteriaSchema } from "@/lib/validation/broadcasts";

export function emptyTargetingCriteria(): TargetingCriteria {
  return {
    professions: [],
    verifiedOnly: false,
    locations: [],
    networkOnly: false,
    relationshipTypes: [],
    professionalIds: [],
    excludeProfessionalIds: [],
  };
}

export function applyBroadcastTypeConstraints(
  type: BroadcastType,
  criteria: TargetingCriteria,
): TargetingCriteria {
  return {
    professions: [...criteria.professions],
    verifiedOnly: type === "emergency" ? true : criteria.verifiedOnly,
    locations: [...criteria.locations],
    networkOnly: type === "internal_locum" ? true : criteria.networkOnly,
    relationshipTypes: [...criteria.relationshipTypes],
    professionalIds: [...criteria.professionalIds],
    excludeProfessionalIds: [...criteria.excludeProfessionalIds],
  };
}

export function parseStoredTargetingCriteria(
  value: unknown,
): TargetingCriteria {
  const parsed = TargetingCriteriaSchema.safeParse(value);
  if (!parsed.success) {
    return { ...EMPTY_TARGETING_CRITERIA };
  }
  return parsed.data;
}

export function summarizeTargetingCriteria(
  criteria: TargetingCriteria,
): TargetingSummary {
  return {
    verifiedOnly: criteria.verifiedOnly,
    professions: [...criteria.professions],
    locations: [...criteria.locations],
    networkOnly: criteria.networkOnly,
    relationshipTypes: [...criteria.relationshipTypes],
    includedCount: criteria.professionalIds.length,
    excludedCount: criteria.excludeProfessionalIds.length,
  };
}

export function formatTargetingSummaryLines(
  criteria: TargetingCriteria,
): string[] {
  const lines = [
    `Verified professionals: ${criteria.verifiedOnly ? "Yes" : "No"}`,
    `Profession: ${
      criteria.professions.length > 0 ? criteria.professions.join(", ") : "Any"
    }`,
    `Location: ${
      criteria.locations.length > 0 ? criteria.locations.join(", ") : "Any"
    }`,
  ];
  if (criteria.networkOnly || criteria.relationshipTypes.length > 0) {
    const relationships =
      criteria.relationshipTypes.length > 0
        ? criteria.relationshipTypes
            .map((type) => NETWORK_RELATIONSHIP_LABELS[type])
            .join(", ")
        : "All network members";
    lines.push(`Network: ${relationships}`);
  } else {
    lines.push("Network: Not restricted");
  }
  return lines;
}

export function broadcastTypeLabel(type: BroadcastType): string {
  return BROADCAST_TYPE_LABELS[type];
}
