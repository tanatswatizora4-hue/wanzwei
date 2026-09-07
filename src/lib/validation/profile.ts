import { z } from "zod";

import { parsePremisesNumberInput } from "@/lib/facilities/premises-number";
import { FacilityTypeSchema } from "@/lib/validation/auth";

const ProtectedSettingsFieldsSchema = z
  .object({
    role: z.never().optional(),
    verified: z.never().optional(),
    facilityId: z.never().optional(),
    facility_id: z.never().optional(),
    registrationNumber: z.never().optional(),
    registration_number: z.never().optional(),
    registeringBody: z.never().optional(),
    registering_body: z.never().optional(),
    profession: z.never().optional(),
  })
  .strict();

export const SettingsProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    location: z.string().trim().max(120).optional(),
    organisationName: z.string().trim().min(1).max(160).optional(),
    facilityLocation: z.string().trim().min(1).max(120).optional(),
    facilityType: FacilityTypeSchema.optional(),
    premisesNumber: z.string().trim().max(40).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.premisesNumber === undefined) return;
    const parsed = parsePremisesNumberInput(value.premisesNumber);
    if (!parsed.ok) {
      ctx.addIssue({
        code: "custom",
        path: ["premisesNumber"],
        message: parsed.message,
      });
    }
  })
  .transform((value) => {
    if (value.premisesNumber === undefined) return value;
    const parsed = parsePremisesNumberInput(value.premisesNumber);
    return {
      ...value,
      premisesNumber: parsed.ok
        ? (parsed.value ?? "")
        : value.premisesNumber,
    };
  });

export const AvatarProfilePatchSchema = z.object({
  avatar: z.string().trim().min(1, "Avatar path is required").max(512),
});

export type SettingsProfileUpdateInput = z.infer<
  typeof SettingsProfileUpdateSchema
>;
export type AvatarProfilePatchInput = z.infer<typeof AvatarProfilePatchSchema>;

export function assertNoProtectedSettingsFields(
  raw: Record<string, unknown>,
): boolean {
  const present: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) present[key] = value;
  }
  return ProtectedSettingsFieldsSchema.safeParse(present).success;
}
