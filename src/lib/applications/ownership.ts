import type { Role } from "@/lib/types";

export function canProfessionalViewApplication(input: {
  actor: { role: Role; id: string } | null;
  applicationProfessionalId: string;
}): boolean {
  if (!input.actor) return false;
  if (input.actor.role !== "professional") return false;
  return input.actor.id === input.applicationProfessionalId;
}

export function canFacilityAccessApplication(input: {
  actor: { role: Role; facilityId?: string | null } | null;
  jobFacilityId: string;
}): boolean {
  if (!input.actor) return false;
  if (input.actor.role === "admin") return true;
  if (input.actor.role !== "facility") return false;
  const facilityId = input.actor.facilityId?.trim();
  if (!facilityId) return false;
  return facilityId === input.jobFacilityId;
}
