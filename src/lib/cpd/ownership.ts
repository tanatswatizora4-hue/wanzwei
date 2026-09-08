import type { Role } from "@/lib/types";

export function canProfessionalEnrol(input: {
  actor: { role: Role; id: string } | null;
  professionalMembership?: boolean;
}): boolean {
  if (!input.actor) return false;
  if (input.actor.role === "admin") return false;
  return (
    input.actor.role === "professional" || input.professionalMembership === true
  );
}

export function canProfessionalMutateEnrolment(input: {
  actor: { role: Role; id: string } | null;
  enrolmentUserId: string;
  professionalMembership?: boolean;
}): boolean {
  if (!input.actor) return false;
  if (input.actor.role === "admin") return true;
  if (
    input.actor.role !== "professional" &&
    input.professionalMembership !== true
  ) {
    return false;
  }
  return input.actor.id === input.enrolmentUserId;
}

export function canAdminManageCourses(input: {
  actor: { role: Role } | null;
}): boolean {
  return input.actor?.role === "admin";
}
