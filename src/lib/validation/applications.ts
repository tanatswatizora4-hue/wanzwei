import { z } from "zod";

export const ApplicationStatusSchema = z.enum([
  "Under Review",
  "Screening",
  "Shortlisted",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
]);

export const CreateApplicationSchema = z.object({
  jobId: z.uuid("Invalid job id"),
  professionalId: z.uuid("Invalid professional id"),
  status: ApplicationStatusSchema.default("Under Review"),
  notes: z.string().trim().max(2000).optional(),
});

export const UpdateApplicationStatusSchema = z.object({
  id: z.uuid("Invalid application id"),
  status: ApplicationStatusSchema,
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<
  typeof UpdateApplicationStatusSchema
>;
