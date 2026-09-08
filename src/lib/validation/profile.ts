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
    regulatoryBodyOther: z.never().optional(),
    regulatory_body_other: z.never().optional(),
    profession: z.never().optional(),
    identityVerificationStatus: z.never().optional(),
    identity_verification_status: z.never().optional(),
    credentialStatus: z.never().optional(),
    credential_status: z.never().optional(),
    credentialVerifiedAt: z.never().optional(),
    credential_verified_at: z.never().optional(),
    credentialVerificationMethod: z.never().optional(),
    credential_verification_method: z.never().optional(),
    practisingCertificateExpiry: z.never().optional(),
    practising_certificate_expiry: z.never().optional(),
    practisingCertificateStatus: z.never().optional(),
    practising_certificate_status: z.never().optional(),
    lastVerificationReviewAt: z.never().optional(),
    last_verification_review_at: z.never().optional(),
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
