import { z } from "zod";

import {
  HPA_BODY,
  isSupportedRegisteringBody,
  parsedRegistrationOrNull,
} from "@/lib/registry/match";
import { formatParsedPersonNumber } from "@/lib/registry/persons-register";

export const SubmitVerificationSchema = z.object({
  registeringBody: z
    .string()
    .trim()
    .min(1, "Registering body is required")
    .max(40)
    .refine(isSupportedRegisteringBody, {
      message: "Only HPA registration is supported right now.",
    })
    .transform(() => HPA_BODY),
  registrationNumber: z
    .string()
    .trim()
    .min(1, "Registration number is required")
    .max(32)
    .refine((value) => parsedRegistrationOrNull(value) != null, {
      message: "Registration number must look like A99-9999-YYYY.",
    })
    .transform((value) => {
      const parsed = parsedRegistrationOrNull(value);
      return parsed ? formatParsedPersonNumber(parsed) : value;
    }),
  profession: z
    .string()
    .trim()
    .min(1, "Profession is required")
    .max(120),
});

export type SubmitVerificationInput = z.infer<typeof SubmitVerificationSchema>;
