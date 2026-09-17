export const NETWORK_RELATIONSHIP_TYPES = [
  "employee",
  "approved_locum",
  "previous_locum",
  "contractor",
  "talent_pool",
  "other",
] as const;

export const NETWORK_STATUSES = ["active", "inactive", "invited"] as const;

export const BROADCAST_TYPES = [
  "emergency",
  "locum",
  "internal_locum",
  "targeted_opportunity",
] as const;

export const BROADCAST_STATUSES = ["draft", "sent", "cancelled"] as const;

export const BROADCAST_RECIPIENT_STATUSES = ["notified", "failed"] as const;

export const TARGETING_CRITERIA_KEYS = [
  "professions",
  "verifiedOnly",
  "locations",
  "networkOnly",
  "relationshipTypes",
  "professionalIds",
  "excludeProfessionalIds",
] as const;

export type NetworkRelationshipType = (typeof NETWORK_RELATIONSHIP_TYPES)[number];
export type NetworkStatus = (typeof NETWORK_STATUSES)[number];
export type BroadcastType = (typeof BROADCAST_TYPES)[number];
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];
export type BroadcastRecipientStatus =
  (typeof BROADCAST_RECIPIENT_STATUSES)[number];
export type TargetingCriteriaKey = (typeof TARGETING_CRITERIA_KEYS)[number];

export type TargetingCriteria = {
  professions: string[];
  verifiedOnly: boolean;
  locations: string[];
  networkOnly: boolean;
  relationshipTypes: NetworkRelationshipType[];
  professionalIds: string[];
  excludeProfessionalIds: string[];
};

export const EMPTY_TARGETING_CRITERIA: TargetingCriteria = {
  professions: [],
  verifiedOnly: false,
  locations: [],
  networkOnly: false,
  relationshipTypes: [],
  professionalIds: [],
  excludeProfessionalIds: [],
};

export const NETWORK_RELATIONSHIP_LABELS: Record<
  NetworkRelationshipType,
  string
> = {
  employee: "Employee",
  approved_locum: "Approved locum",
  previous_locum: "Previous locum",
  contractor: "Contractor",
  talent_pool: "Talent pool",
  other: "Other",
};

export const BROADCAST_TYPE_LABELS: Record<BroadcastType, string> = {
  emergency: "Emergency",
  locum: "Locum",
  internal_locum: "Internal locum",
  targeted_opportunity: "Targeted opportunity",
};

export type BroadcastMatchCandidate = {
  id: string;
  role: string;
  verified?: boolean | null;
  profession?: string | null;
  location?: string | null;
  name: string;
  email: string;
};

export type NetworkMembershipRecord = {
  professionalUserId: string;
  relationshipType: NetworkRelationshipType;
  status: NetworkStatus;
};

export type PreviewProfessional = {
  id: string;
  name: string;
  profession: string | null;
  location: string | null;
  verified: boolean;
  relationshipType: NetworkRelationshipType | null;
};

export type TargetingSummary = {
  verifiedOnly: boolean;
  professions: string[];
  locations: string[];
  networkOnly: boolean;
  relationshipTypes: NetworkRelationshipType[];
  includedCount: number;
  excludedCount: number;
};

export type FacilityNetworkMember = {
  id: string;
  facilityId: string;
  professionalUserId: string;
  name: string;
  email: string;
  profession: string | null;
  location: string | null;
  verified: boolean;
  relationshipType: NetworkRelationshipType;
  status: NetworkStatus;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkforceBroadcastRecord = {
  id: string;
  facilityId: string;
  createdBy: string;
  type: BroadcastType;
  title: string;
  message: string;
  location: string | null;
  positionsNeeded: number | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  status: BroadcastStatus;
  targetingCriteria: TargetingCriteria;
  matchedRecipientCount: number;
  jobId: string | null;
  emergencyAlertId: string | null;
  createdAt: string;
  sentAt: string | null;
  facilityName?: string | null;
};

export function isBroadcastType(value: string): value is BroadcastType {
  return (BROADCAST_TYPES as readonly string[]).includes(value);
}

export function isNetworkRelationshipType(
  value: string,
): value is NetworkRelationshipType {
  return (NETWORK_RELATIONSHIP_TYPES as readonly string[]).includes(value);
}
