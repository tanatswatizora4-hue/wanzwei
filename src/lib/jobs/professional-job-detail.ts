import type { Facility, Job, Role } from "@/lib/types";
import { JobIdSchema } from "@/lib/validation/jobs";

import { professionalJobPath } from "./paths";

export function parseProfessionalJobId(id: string): string | null {
  const parsed = JobIdSchema.safeParse({ jobId: id });
  return parsed.success ? parsed.data.jobId : null;
}

export function professionalJobHref(jobId: string): string {
  return professionalJobPath(jobId);
}

export type ProfessionalJobDetailView =
  | { status: "not_found" }
  | {
      status: "ok";
      job: Job;
      facility: Facility;
      isOpen: boolean;
    };

export function presentProfessionalJobDetail(
  row: { job: Job; facility: Facility } | null,
): ProfessionalJobDetailView {
  if (!row) return { status: "not_found" };
  return {
    status: "ok",
    job: row.job,
    facility: row.facility,
    isOpen: row.job.status === "Open",
  };
}

export function canViewProfessionalJobDetail(
  actor: { role: Role } | null,
): boolean {
  return actor?.role === "professional";
}
