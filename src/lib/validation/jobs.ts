import { z } from "zod";

export const EmploymentTypeSchema = z.enum([
  "Full-time",
  "Part-time",
  "Locum",
  "Contract",
  "Permanent",
]);

export const JobStatusSchema = z.enum([
  "Open",
  "Interested",
  "Shortlisted",
  "Matched",
  "Closed",
]);

export const CreateJobSchema = z.object({
  facilityId: z.uuid("Invalid facility id"),
  title: z.string().trim().min(1, "Title is required").max(160),
  location: z.string().trim().min(1, "Location is required").max(120),
  type: EmploymentTypeSchema,
  salary: z.string().trim().max(120).optional(),
  status: JobStatusSchema.default("Open"),
  applicantsCount: z.coerce.number().int().min(0).default(0),
  description: z.string().trim().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

export const SaveJobSchema = z.object({
  userId: z.uuid("Invalid user id"),
  jobId: z.uuid("Invalid job id"),
});

export const JobIdSchema = z.object({
  jobId: z.uuid("Invalid job id"),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type SaveJobInput = z.infer<typeof SaveJobSchema>;
export type JobIdInput = z.infer<typeof JobIdSchema>;
