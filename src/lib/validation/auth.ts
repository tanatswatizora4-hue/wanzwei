import { z } from "zod";

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email"),
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

export const SignupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long"),
  role: z
    .enum(["professional", "facility"], {
      message: "Role must be 'professional' or 'facility'",
    })
    .default("professional"),
});

export type SignupInput = z.infer<typeof SignupSchema>;

export const AuthEmailRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email"),
});

export const PasswordResetRequestSchema = AuthEmailRequestSchema;

export const VerificationEmailRequestSchema = AuthEmailRequestSchema;

export type PasswordResetRequestInput = z.infer<
  typeof PasswordResetRequestSchema
>;

export type VerificationEmailRequestInput = z.infer<
  typeof VerificationEmailRequestSchema
>;
