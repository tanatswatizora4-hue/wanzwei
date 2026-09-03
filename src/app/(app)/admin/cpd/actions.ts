"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { catalogueCoverClass } from "@/lib/catalogue/cover";
import { canAdminManageCourses } from "@/lib/cpd/ownership";
import { hasDbConfig } from "@/lib/db/client";
import { createCourse, getCourseById, updateCourse } from "@/lib/repos/courses";
import { CreateCourseSchema, UpdateCourseSchema } from "@/lib/validation/cpd";
import { ServerActionValidationError } from "@/lib/validation/errors";

const DEFAULT_COVER = "from-violet-500 to-slate-800";

function formCourseFields(formData: FormData) {
  return {
    title: formData.get("title"),
    provider: formData.get("provider"),
    category: formData.get("category"),
    duration: formData.get("duration"),
    credits: formData.get("credits"),
    cover: formData.get("cover") || undefined,
    recommended: formData.get("recommended"),
    description: formData.get("description") ?? "",
    format: formData.get("format") || "Online",
    location: formData.get("location") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  };
}

export async function createCourseAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["admin"]);
  if (!canAdminManageCourses({ actor: user })) {
    return actionError("Only administrators can manage the CPD catalogue.");
  }
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = CreateCourseSchema.safeParse(formCourseFields(formData));
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const created = await createCourse({
    title: parsed.data.title,
    provider: parsed.data.provider,
    category: parsed.data.category,
    duration: parsed.data.duration,
    credits: String(parsed.data.credits),
    cover: catalogueCoverClass(parsed.data.cover, DEFAULT_COVER),
    recommended: parsed.data.recommended,
    description: parsed.data.description,
    format: parsed.data.format,
    location: parsed.data.location || null,
    startsAt: parsed.data.startsAt ?? null,
    endsAt: parsed.data.endsAt ?? null,
  });
  if (!created) {
    return actionError("Could not create this CPD opportunity.");
  }

  revalidatePath("/admin/cpd");
  revalidatePath("/professional/cpd");
  return actionOk();
}

export async function updateCourseAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["admin"]);
  if (!canAdminManageCourses({ actor: user })) {
    return actionError("Only administrators can manage the CPD catalogue.");
  }
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = UpdateCourseSchema.safeParse({
    id: formData.get("id"),
    ...formCourseFields(formData),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const existing = await getCourseById(parsed.data.id);
  if (!existing) {
    return actionError("CPD opportunity not found.");
  }

  const updated = await updateCourse(parsed.data.id, {
    title: parsed.data.title,
    provider: parsed.data.provider,
    category: parsed.data.category,
    duration: parsed.data.duration,
    credits: String(parsed.data.credits),
    cover: catalogueCoverClass(parsed.data.cover, DEFAULT_COVER),
    recommended: parsed.data.recommended,
    description: parsed.data.description,
    format: parsed.data.format,
    location: parsed.data.location || null,
    startsAt: parsed.data.startsAt ?? null,
    endsAt: parsed.data.endsAt ?? null,
  });
  if (!updated) {
    return actionError("Could not update this CPD opportunity.");
  }

  revalidatePath("/admin/cpd");
  revalidatePath(`/admin/cpd/${parsed.data.id}`);
  revalidatePath("/professional/cpd");
  revalidatePath(`/professional/cpd/${parsed.data.id}`);
  return actionOk();
}
