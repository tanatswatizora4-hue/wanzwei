"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { canProfessionalEnrol } from "@/lib/cpd/ownership";
import { hasDbConfig } from "@/lib/db/client";
import {
  completeEnrolmentForUser,
  enrolUserInCourse,
  getEnrolmentForUserCourse,
  withdrawEnrolmentForUser,
} from "@/lib/repos/course-enrolments";
import { getCourseById } from "@/lib/repos/courses";
import { CourseIdSchema } from "@/lib/validation/cpd";
import { ServerActionValidationError } from "@/lib/validation/errors";

function revalidateCpd(courseId: string) {
  revalidatePath("/professional/cpd");
  revalidatePath(`/professional/cpd/${courseId}`);
}

export async function enrolInCourseAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["professional"]);
  if (!canProfessionalEnrol({ actor: user })) {
    return actionError("Only professionals can register for CPD.");
  }
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = CourseIdSchema.safeParse({
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const course = await getCourseById(parsed.data.courseId);
  if (!course) {
    return actionError("CPD opportunity not found.");
  }

  const enrolment = await enrolUserInCourse(user.id, parsed.data.courseId);
  if (!enrolment) {
    return actionError("Could not register for this CPD opportunity.");
  }

  revalidateCpd(parsed.data.courseId);
  return actionOk();
}

export async function completeCourseEnrolmentAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["professional"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = CourseIdSchema.safeParse({
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const existing = await getEnrolmentForUserCourse(user.id, parsed.data.courseId);
  if (!existing || existing.userId !== user.id) {
    return actionError("You are not registered for this CPD opportunity.");
  }
  if (existing.status !== "registered") {
    return actionError("Only a registered activity can be marked complete.");
  }

  const updated = await completeEnrolmentForUser(user.id, parsed.data.courseId);
  if (!updated) {
    return actionError("Could not record completion.");
  }

  revalidateCpd(parsed.data.courseId);
  return actionOk();
}

export async function withdrawCourseEnrolmentAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["professional"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = CourseIdSchema.safeParse({
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const existing = await getEnrolmentForUserCourse(user.id, parsed.data.courseId);
  if (!existing || existing.userId !== user.id) {
    return actionError("You are not registered for this CPD opportunity.");
  }

  const updated = await withdrawEnrolmentForUser(user.id, parsed.data.courseId);
  if (!updated) {
    return actionError("Could not withdraw this registration.");
  }

  revalidateCpd(parsed.data.courseId);
  return actionOk();
}
