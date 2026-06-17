import { z } from "zod";

export const UrgencySchema = z.enum(["Standard", "High", "Critical"]);
export const PayCurrencySchema = z.enum(["USD", "ZWL", "ZAR"]);
export const PayPeriodSchema = z.enum(["hour", "shift", "day"]);
export const AlertResponseSchema = z.enum(["Accepted", "Declined"]);

const dateTimeStringSchema = z
  .string()
  .trim()
  .min(1, "Date/time is required")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid date/time",
  });

export const CreateEmergencyAlertSchema = z
  .object({
    profession: z.string().trim().min(1, "Profession is required").max(120),
    location: z.string().trim().min(1, "Location is required").max(120),
    urgency: UrgencySchema.default("High"),
    shiftStart: dateTimeStringSchema,
    shiftEnd: dateTimeStringSchema,
    notes: z.string().trim().max(2000).default(""),
    payMin: z.coerce.number().min(0).max(999999),
    payMax: z.coerce.number().min(0).max(999999),
    payCurrency: PayCurrencySchema.default("USD"),
    payPeriod: PayPeriodSchema.default("hour"),
    expiresInMinutes: z.coerce.number().int().min(15).max(1440).default(60),
  })
  .refine(
    ({ shiftStart, shiftEnd }) =>
      new Date(shiftEnd).getTime() > new Date(shiftStart).getTime(),
    {
      path: ["shiftEnd"],
      message: "Shift end must be after shift start",
    },
  )
  .refine(({ payMin, payMax }) => payMax >= payMin, {
    path: ["payMax"],
    message: "Maximum pay must be greater than or equal to minimum pay",
  });

export const CancelEmergencyAlertSchema = z.object({
  alertId: z.string().trim().min(1, "Alert id is required").max(120),
});

export const RespondToEmergencyAlertSchema = z.object({
  alertId: z.string().trim().min(1, "Alert id is required").max(120),
  response: AlertResponseSchema,
});

export type CreateEmergencyAlertInput = z.infer<
  typeof CreateEmergencyAlertSchema
>;
export type CancelEmergencyAlertInput = z.infer<
  typeof CancelEmergencyAlertSchema
>;
export type RespondToEmergencyAlertInput = z.infer<
  typeof RespondToEmergencyAlertSchema
>;
