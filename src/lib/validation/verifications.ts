import { z } from "zod";

import {
  HPA_BODY,
  isSupportedRegisteringBody,
  parsedRegistrationOrNull,
} from "@/lib/registry/match";
import { formatParsedPersonNumber } from "@/lib/registry/persons-register";

const optionalHpaBody = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z
    .string()
    .trim()
    .max(40)
    .refine(isSupportedRegisteringBody, {
      message: "Only HPA registration is supported right now.",
    })
    .transform(() => HPA_BODY)
    .optional(),
);

const optionalRegistrationNumber = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z
    .string()
    .trim()
    .max(32)
    .refine((value) => parsedRegistrationOrNull(value) != null, {
      message: "Registration number must look like A99-9999-YYYY.",
    })
    .transform((value) => {
      const parsed = parsedRegistrationOrNull(value);
      return parsed ? formatParsedPersonNumber(parsed) : value;
    })
    .optional(),
);

export const SubmitVerificationSchema = z
  .object({
    profession: z.string().trim().min(1, "Profession is required").max(120),
    identityDocumentId: z.string().uuid("Identity document is required"),
    credentialDocumentId: z.string().uuid("Professional credential is required"),
    registeringBody: optionalHpaBody,
    registrationNumber: optionalRegistrationNumber,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.registrationNumber && !value.registeringBody) {
      ctx.addIssue({
        code: "custom",
        path: ["registeringBody"],
        message: "Registering body is required when a registration number is submitted.",
      });
    }
  });

export type SubmitVerificationInput = z.infer<typeof SubmitVerificationSchema>;
