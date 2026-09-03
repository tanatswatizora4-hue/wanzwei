import type { Role } from "@/lib/types";

export function canProfessionalMutateEnrolment(input: {
  actor: { role: Role; id: string } | null;
  enrolmentUserId: string;
}): boolean {
  if (!input.actor) return false;
  if (input.actor.role === "admin") return true;
  if (input.actor.role !== "professional") return false;
  return input.actor.id === input.enrolmentUserId;
}

export function canProfessionalEnrol(input: {
  actor: { role: Role; id: string } | null;
}): boolean {
  if (!input.actor) return false;
  return input.actor.role === "professional";
}

export function canAdminManageCourses(input: {
  actor: { role: Role } | null;
}): boolean {
  return input.actor?.role === "admin";
}
