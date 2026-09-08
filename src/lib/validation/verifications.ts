import { z } from "zod";

import { CanonicalProfessionSchema } from "@/lib/professions";
import {
  RegulatoryBodyOtherSchema,
  RegulatoryBodySchema,
  isOtherRegulatoryBody,
} from "@/lib/regulatory-bodies";
import { parsedRegistrationOrNull } from "@/lib/registry/match";
import { formatParsedPersonNumber } from "@/lib/registry/persons-register";

function normalizeSubmittedRegistrationNumber(value: string): string {
  const parsed = parsedRegistrationOrNull(value);
  return parsed ? formatParsedPersonNumber(parsed) : value.trim().replace(/\s+/g, " ");
}

function isPlausibleRegistrationNumber(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 40) return false;
  return /^[A-Za-z0-9][A-Za-z0-9./\- ]*$/.test(trimmed);
}

const registrationNumber = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z
    .string()
    .trim()
    .min(2, "Registration number is required")
    .max(40, "Registration number is too long")
    .refine(isPlausibleRegistrationNumber, {
      message: "Enter a valid professional registration number.",
    })
    .transform(normalizeSubmittedRegistrationNumber),
);

export const SubmitVerificationSchema = z
  .object({
    profession: CanonicalProfessionSchema,
    identityDocumentId: z.string().uuid("Identity document is required"),
    credentialDocumentId: z.string().uuid("Professional credential is required"),
    registeringBody: RegulatoryBodySchema,
    registrationNumber,
    regulatoryBodyOther: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      RegulatoryBodyOtherSchema.optional(),
    ),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (isOtherRegulatoryBody(value.registeringBody) && !value.regulatoryBodyOther) {
      ctx.addIssue({
        code: "custom",
        path: ["regulatoryBodyOther"],
        message: "Name of regulatory body is required.",
      });
    }
    if (
      !isOtherRegulatoryBody(value.registeringBody) &&
      value.regulatoryBodyOther
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["regulatoryBodyOther"],
        message: "Name of regulatory body is only used when Other is selected.",
      });
    }
  });

export type SubmitVerificationInput = z.infer<typeof SubmitVerificationSchema>;
