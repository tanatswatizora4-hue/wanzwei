import type {
  BroadcastMatchCandidate,
  NetworkMembershipRecord,
  PreviewProfessional,
  TargetingCriteria,
} from "@/lib/broadcasts/network-types";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function professionMatches(
  stored: string | null | undefined,
  professions: string[],
): boolean {
  if (professions.length === 0) return true;
  const value = normalizeText(stored);
  if (!value) return false;
  return professions.some((profession) => normalizeText(profession) === value);
}

function locationMatches(
  stored: string | null | undefined,
  locations: string[],
): boolean {
  if (locations.length === 0) return true;
  const value = normalizeText(stored);
  if (!value) return false;
  return locations.some((location) => {
    const needle = normalizeText(location);
    if (!needle) return false;
    return value === needle || value.includes(needle) || needle.includes(value);
  });
}

function isProfessionalIdentity(candidate: BroadcastMatchCandidate): boolean {
  return candidate.role === "professional";
}

export function matchProfessionals(input: {
  candidates: BroadcastMatchCandidate[];
  network: NetworkMembershipRecord[];
  criteria: TargetingCriteria;
}): BroadcastMatchCandidate[] {
  const include = new Set(input.criteria.professionalIds);
  const exclude = new Set(input.criteria.excludeProfessionalIds);
  const activeNetwork = new Map(
    input.network
      .filter((row) => row.status === "active")
      .map((row) => [row.professionalUserId, row]),
  );

  return input.candidates.filter((candidate) => {
    if (!isProfessionalIdentity(candidate)) return false;
    if (exclude.has(candidate.id)) return false;
    if (include.size > 0 && !include.has(candidate.id)) return false;
    if (input.criteria.verifiedOnly && candidate.verified !== true) return false;
    if (!professionMatches(candidate.profession, input.criteria.professions)) {
      return false;
    }
    if (!locationMatches(candidate.location, input.criteria.locations)) {
      return false;
    }

    const membership = activeNetwork.get(candidate.id);
    if (input.criteria.networkOnly && !membership) return false;
    if (input.criteria.relationshipTypes.length > 0) {
      if (!membership) return false;
      if (!input.criteria.relationshipTypes.includes(membership.relationshipType)) {
        return false;
      }
    }
    return true;
  });
}

export function toPreviewProfessionals(input: {
  matched: BroadcastMatchCandidate[];
  network: NetworkMembershipRecord[];
}): PreviewProfessional[] {
  const activeNetwork = new Map(
    input.network
      .filter((row) => row.status === "active")
      .map((row) => [row.professionalUserId, row]),
  );
  return input.matched.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    profession: candidate.profession ?? null,
    location: candidate.location ?? null,
    verified: candidate.verified === true,
    relationshipType: activeNetwork.get(candidate.id)?.relationshipType ?? null,
  }));
}

/**
 * Send never trusts a client-supplied count or recipient list.
 * Recipients are the server-matched set only.
 */
export function recipientsForSend<T>(matched: T[]): { recipients: T[]; count: number } {
  return { recipients: [...matched], count: matched.length };
}

export function canProfessionalViewBroadcast(input: {
  professionalUserId: string;
  recipientProfessionalUserId: string | null | undefined;
}): boolean {
  return (
    !!input.recipientProfessionalUserId &&
    input.recipientProfessionalUserId === input.professionalUserId
  );
}
