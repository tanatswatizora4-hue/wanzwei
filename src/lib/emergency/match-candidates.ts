import type { User } from "@/lib/types";

export type EmergencyCandidate = Pick<
  User,
  "id" | "role" | "verified" | "profession" | "location" | "email" | "name"
>;

export type EmergencyMatchCriteria = {
  profession: string;
  location: string;
};

/**
 * Eligibility for emergency alerts. No implicit count cap — every matching
 * verified professional must be evaluated.
 */
export function filterEligibleEmergencyProfessionals(
  candidates: EmergencyCandidate[],
  criteria: EmergencyMatchCriteria,
): EmergencyCandidate[] {
  const expectedProfession = criteria.profession.trim().toLowerCase();
  const expectedLocation = criteria.location.trim().toLowerCase();
  if (!expectedProfession) return [];

  return candidates.filter((candidate) => {
    if (candidate.role !== "professional") return false;
    if (candidate.verified !== true) return false;
    if ((candidate.profession ?? "").toLowerCase() !== expectedProfession) {
      return false;
    }
    if (expectedLocation === "any") return true;
    return (candidate.location ?? "").toLowerCase() === expectedLocation;
  });
}

/** Recipients are the full eligible set. Batching must not drop anyone. */
export function recipientsForEmergencyAlert<T>(eligible: T[]): T[] {
  return [...eligible];
}

export function batchWithoutDropping<T>(items: T[], batchSize: number): T[][] {
  const size = Math.max(1, Math.floor(batchSize));
  if (items.length === 0) return [];
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
