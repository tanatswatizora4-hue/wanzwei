import { z } from "zod";

export const CourseCategorySchema = z.enum([
  "Clinical",
  "Compliance",
  "Leadership",
  "Tech",
  "Wellbeing",
]);

export const CourseFormatSchema = z.enum(["Online", "In person", "Hybrid"]);

export const CourseEnrolmentStatusSchema = z.enum([
  "registered",
  "completed",
  "withdrawn",
]);

function optionalDate(value: unknown): Date | null | undefined {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export const CreateCourseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  provider: z.string().trim().min(1, "Provider is required").max(160),
  category: CourseCategorySchema,
  duration: z.string().trim().min(1, "Duration is required").max(80),
  credits: z.coerce.number().min(0).max(1000),
  cover: z.string().trim().max(160).optional(),
  recommended: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
  description: z.string().trim().max(5000).default(""),
  format: CourseFormatSchema.default("Online"),
  location: z.string().trim().max(160).optional(),
  startsAt: z.preprocess(optionalDate, z.date().nullable().optional()),
  endsAt: z.preprocess(optionalDate, z.date().nullable().optional()),
});

export const UpdateCourseSchema = CreateCourseSchema.extend({
  id: z.uuid("Invalid course id"),
});

export const CourseIdSchema = z.object({
  courseId: z.uuid("Invalid course id"),
});

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
