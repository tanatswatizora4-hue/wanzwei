import type { ApplicationStatus } from "@/lib/types";

/**
 * Canonical facility/admin application pipeline.
 * Terminal states cannot be moved except by a new application.
 */
export const APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  "Under Review": ["Screening", "Shortlisted", "Rejected"],
  Screening: ["Shortlisted", "Interview", "Rejected"],
  Shortlisted: ["Interview", "Offer", "Rejected"],
  Interview: ["Offer", "Shortlisted", "Rejected"],
  Offer: ["Hired", "Rejected"],
  Hired: [],
  Rejected: [],
};

export function canTransitionApplicationStatus(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (from === to) return true;
  return APPLICATION_TRANSITIONS[from].includes(to);
}

export function nextApplicationStatuses(
  from: ApplicationStatus,
): ApplicationStatus[] {
  return [from, ...APPLICATION_TRANSITIONS[from]];
}
