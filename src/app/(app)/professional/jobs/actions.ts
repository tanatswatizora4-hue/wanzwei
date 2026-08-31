"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { hasDbConfig } from "@/lib/db/client";
import { applyForJob } from "@/lib/repos/applications";
import { saveJob, unsaveJob } from "@/lib/repos/jobs";
import { requireRole, requireVerifiedProfessional } from "@/lib/auth/session";
import { JobIdSchema } from "@/lib/validation/jobs";

export async function applyForJobAction(jobId: string): Promise<ActionResult> {
  const access = await requireVerifiedProfessional();
  if (!access.ok) {
    return actionError(access.error);
  }
  const user = access.user;
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = JobIdSchema.safeParse({ jobId });
  if (!parsed.success) {
    return actionError("Invalid job.");
  }

  const result = await applyForJob(parsed.data.jobId, user.id);
  if (!result.ok) {
    if (result.reason === "duplicate") {
      return actionError("You have already applied for this role.");
    }
    if (result.reason === "job_closed") {
      return actionError("This role is no longer accepting applications.");
    }
    return actionError("Job not found.");
  }

  revalidatePath("/professional/jobs");
  revalidatePath("/professional/applications");
  revalidatePath("/professional/dashboard");
  revalidatePath("/professional/saved");
  return actionOk();
}

export async function toggleSaveJobAction(
  jobId: string,
  shouldSave: boolean,
): Promise<ActionResult> {
  const user = await requireRole(["professional"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = JobIdSchema.safeParse({ jobId });
  if (!parsed.success) {
    return actionError("Invalid job.");
  }

  if (shouldSave) {
    const row = await saveJob({
      userId: user.id,
      jobId: parsed.data.jobId,
    });
    if (!row) {
      return actionError("Could not save job.");
    }
  } else {
    await unsaveJob(user.id, parsed.data.jobId);
  }

  revalidatePath("/professional/jobs");
  revalidatePath("/professional/saved");
  revalidatePath("/professional/dashboard");
  return actionOk();
}
