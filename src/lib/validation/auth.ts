import { z } from "zod";

import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import { parsePremisesNumberInput } from "@/lib/facilities/premises-number";
import { CanonicalProfessionSchema } from "@/lib/professions";
import {
  RegulatoryBodyOtherSchema,
  RegulatoryBodySchema,
  isOtherRegulatoryBody,
} from "@/lib/regulatory-bodies";

const EmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email")
  .transform((value) => normalizeEmailAddress(value));

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required"),
  next: z
    .string()
    .trim()
    .max(2048)
    // Only allow same-origin relative paths to prevent open-redirect abuse.
    .refine((v) => v.startsWith("/") && !v.startsWith("//"), {
      message: "Invalid redirect target",
    })
    .optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ---------------------------------------------------------------------
// Signup
//
// Admin role is intentionally NOT allowed via signup. Admin users must be
// provisioned out-of-band (service-role admin API or seed script).
// ---------------------------------------------------------------------

export const FacilityTypeSchema = z.enum([
  "Hospital",
  "Clinic",
  "Pharmacy",
  "Laboratory",
  "Radiology",
]);

export const SignupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: EmailSchema,
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password is too long"),
    role: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      z
        .enum(["professional", "facility"], {
          message: "Role must be 'professional' or 'facility'",
        })
        .default("professional"),
    ),
    organisationName: z.string().trim().max(160).optional(),
    location: z.string().trim().max(120).optional(),
    facilityType: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      FacilityTypeSchema.optional(),
    ),
    profession: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      CanonicalProfessionSchema.optional(),
    ),
    registeringBody: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      RegulatoryBodySchema.optional(),
    ),
    regulatoryBodyOther: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      RegulatoryBodyOtherSchema.optional(),
    ),
    premisesNumber: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      z.string().trim().max(40).optional(),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.role === "professional" && !value.profession) {
      ctx.addIssue({
        code: "custom",
        path: ["profession"],
        message: "Profession is required",
      });
    }
    if (value.role === "professional" && !value.registeringBody) {
      ctx.addIssue({
        code: "custom",
        path: ["registeringBody"],
        message: "Regulatory body is required",
      });
    }
    if (
      value.role === "professional" &&
      isOtherRegulatoryBody(value.registeringBody) &&
      !value.regulatoryBodyOther
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["regulatoryBodyOther"],
        message: "Name of regulatory body is required",
      });
    }
    if (value.premisesNumber) {
      const parsed = parsePremisesNumberInput(value.premisesNumber);
      if (!parsed.ok) {
        ctx.addIssue({
          code: "custom",
          path: ["premisesNumber"],
          message: parsed.message,
        });
      }
    }
    if (value.role !== "facility") return;
    if (!value.organisationName?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["organisationName"],
        message: "Organisation name is required",
      });
    }
    if (!value.location?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["location"],
        message: "Location is required",
      });
    }
    if (!value.facilityType) {
      ctx.addIssue({
        code: "custom",
        path: ["facilityType"],
        message: "Facility type is required",
      });
    }
  })
  .transform((value) => {
    if (!value.premisesNumber) return value;
    const parsed = parsePremisesNumberInput(value.premisesNumber);
    return {
      ...value,
      premisesNumber: parsed.ok ? (parsed.value ?? undefined) : value.premisesNumber,
    };
  });

export type SignupInput = z.infer<typeof SignupSchema>;

export const AuthEmailRequestSchema = z.object({
  email: EmailSchema,
});

export const PasswordResetRequestSchema = AuthEmailRequestSchema;

export const VerificationEmailRequestSchema = AuthEmailRequestSchema;

export type PasswordResetRequestInput = z.infer<
  typeof PasswordResetRequestSchema
>;

export type VerificationEmailRequestInput = z.infer<
  typeof VerificationEmailRequestSchema
>;

export const CompletePasswordResetSchema = z
  .object({
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "New password and confirmation must match.",
    path: ["confirmPassword"],
  });

export type CompletePasswordResetInput = z.infer<
  typeof CompletePasswordResetSchema
>;
