"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { hasDbConfig } from "@/lib/db/client";
import { resolveFacilityIdForUser } from "@/lib/facility-for-user";
import { getFacility } from "@/lib/repos/facilities";
import { closeJobForFacility, createJob } from "@/lib/repos/jobs";
import { requireRole } from "@/lib/auth/session";
import { CreateJobSchema, JobIdSchema } from "@/lib/validation/jobs";
import { ServerActionValidationError } from "@/lib/validation/errors";

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function createJobAction(formData: FormData): Promise<ActionResult> {
  const user = await requireRole(["facility"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const facilityId = await resolveFacilityIdForUser(user);
  if (!facilityId) {
    return actionError("Link your account to a facility before posting jobs.");
  }

  const facility = await getFacility(facilityId);

  const parsed = CreateJobSchema.safeParse({
    facilityId,
    title: formData.get("title"),
    location: formData.get("location") ?? facility?.location ?? "Harare",
    type: formData.get("type"),
    salary: formData.get("salary") || undefined,
    description: formData.get("description"),
    tags: parseTags(formData.get("tags")),
  });

  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const created = await createJob({
    facilityId: parsed.data.facilityId,
    title: parsed.data.title,
    location: parsed.data.location,
    type: parsed.data.type,
    salary: parsed.data.salary ?? null,
    status: parsed.data.status,
    applicantsCount: parsed.data.applicantsCount,
    description: parsed.data.description,
    tags: parsed.data.tags,
  });

  if (!created) {
    return actionError("Could not create job.");
  }

  revalidatePath("/facility/jobs");
  revalidatePath("/facility/dashboard");
  revalidatePath("/professional/jobs");
  return actionOk();
}

export async function closeJobAction(jobId: string): Promise<ActionResult> {
  const user = await requireRole(["facility"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const facilityId = await resolveFacilityIdForUser(user);
  if (!facilityId) {
    return actionError("Facility profile required.");
  }

  const parsed = JobIdSchema.safeParse({ jobId });
  if (!parsed.success) {
    return actionError("Invalid job.");
  }

  const closed = await closeJobForFacility(parsed.data.jobId, facilityId);
  if (!closed) {
    return actionError("Job not found or already closed.");
  }

  revalidatePath("/facility/jobs");
  revalidatePath("/facility/dashboard");
  revalidatePath("/professional/jobs");
  return actionOk();
}
