import { z } from "zod";

export const ProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120).optional(),
    title: z.string().trim().max(120).optional(),
    location: z.string().trim().max(120).optional(),
    profession: z.string().trim().max(120).optional(),
    cpdCredits: z.coerce.number().min(0).max(9999).optional(),
    cpdTarget: z.coerce.number().min(0).max(9999).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required",
  });

export const AvatarProfilePatchSchema = z.object({
  avatar: z.string().trim().min(1, "Avatar path is required").max(512),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type AvatarProfilePatchInput = z.infer<typeof AvatarProfilePatchSchema>;
