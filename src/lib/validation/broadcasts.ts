import { z } from "zod";

import {
  BROADCAST_TYPES,
  NETWORK_RELATIONSHIP_TYPES,
  NETWORK_STATUSES,
  TARGETING_CRITERIA_KEYS,
} from "@/lib/broadcasts/network-types";
import { CanonicalProfessionSchema } from "@/lib/professions";

export const NetworkRelationshipTypeSchema = z.enum(NETWORK_RELATIONSHIP_TYPES);
export const NetworkStatusSchema = z.enum(NETWORK_STATUSES);
export const BroadcastTypeSchema = z.enum(BROADCAST_TYPES);

const uuidSchema = z.string().uuid();

export const TargetingCriteriaSchema = z
  .object({
    professions: z.array(CanonicalProfessionSchema).default([]),
    verifiedOnly: z.boolean().default(false),
    locations: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    networkOnly: z.boolean().default(false),
    relationshipTypes: z.array(NetworkRelationshipTypeSchema).default([]),
    professionalIds: z.array(uuidSchema).max(500).default([]),
    excludeProfessionalIds: z.array(uuidSchema).max(500).default([]),
  })
  .strict();

export type TargetingCriteriaInput = z.infer<typeof TargetingCriteriaSchema>;

export function parseTargetingCriteria(value: unknown) {
  return TargetingCriteriaSchema.safeParse(value);
}

export function hasUnknownTargetingKeys(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const allowed = new Set<string>(TARGETING_CRITERIA_KEYS);
  return Object.keys(value).filter((key) => !allowed.has(key));
}

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalPositiveInt = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null || value === "") return undefined;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  })
  .pipe(z.number().int().positive().optional());

const optionalDateTime = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) return undefined;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : undefined;
  })
  .refine(
    (value) => value === undefined || !Number.isNaN(new Date(value).getTime()),
    { message: "Invalid date/time" },
  );

export const InterpretTargetingSchema = z
  .object({
    intent: z.string().trim().min(1, "Describe who should receive this.").max(2000),
  })
  .strict();

export const ImproveBroadcastCopySchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(8000),
  })
  .strict();

export const PreviewBroadcastSchema = z
  .object({
    type: BroadcastTypeSchema,
    criteria: TargetingCriteriaSchema,
  })
  .strict();

export const SendBroadcastSchema = z
  .object({
    type: BroadcastTypeSchema,
    title: z.string().trim().min(1, "Title is required").max(160),
    message: z.string().trim().min(1, "Message is required").max(8000),
    location: optionalTrimmed.pipe(z.string().max(120).optional()),
    positionsNeeded: optionalPositiveInt,
    shiftStart: optionalDateTime,
    shiftEnd: optionalDateTime,
    jobId: z.union([uuidSchema, z.literal(""), z.null(), z.undefined()]).transform(
      (value) => (value ? value : undefined),
    ),
    criteria: TargetingCriteriaSchema,
    urgency: z.enum(["Standard", "High", "Critical"]).optional(),
    payMin: z.coerce.number().min(0).max(999999).optional(),
    payMax: z.coerce.number().min(0).max(999999).optional(),
    payCurrency: z.enum(["USD", "ZWL", "ZAR"]).optional(),
    payPeriod: z.enum(["hour", "shift", "day"]).optional(),
    expiresInMinutes: z.coerce.number().int().min(15).max(1440).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.shiftStart && value.shiftEnd) {
      if (new Date(value.shiftEnd).getTime() <= new Date(value.shiftStart).getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["shiftEnd"],
          message: "Shift end must be after shift start",
        });
      }
    }
    if (value.type === "emergency") {
      if (!value.location) {
        ctx.addIssue({
          code: "custom",
          path: ["location"],
          message: "Location is required for emergency broadcasts",
        });
      }
      if (value.criteria.professions.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["criteria", "professions"],
          message: "Choose at least one profession for emergency broadcasts",
        });
      }
      if (!value.shiftStart || !value.shiftEnd) {
        ctx.addIssue({
          code: "custom",
          path: ["shiftStart"],
          message: "Shift start and end are required for emergency broadcasts",
        });
      }
      if (value.payMin == null || value.payMax == null) {
        ctx.addIssue({
          code: "custom",
          path: ["payMin"],
          message: "Pay range is required for emergency broadcasts",
        });
      } else if (value.payMax < value.payMin) {
        ctx.addIssue({
          code: "custom",
          path: ["payMax"],
          message: "Maximum pay must be greater than or equal to minimum pay",
        });
      }
    }
  });

export const AddNetworkMemberSchema = z
  .object({
    email: z.string().trim().min(1).max(254).email(),
    relationshipType: NetworkRelationshipTypeSchema,
  })
  .strict();

export const UpdateNetworkMemberSchema = z
  .object({
    professionalUserId: uuidSchema,
    relationshipType: NetworkRelationshipTypeSchema.optional(),
    status: NetworkStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) => value.relationshipType !== undefined || value.status !== undefined,
    { message: "Nothing to update." },
  );

export const NetworkMemberTargetSchema = z
  .object({
    professionalUserId: uuidSchema,
  })
  .strict();

export const ImprovedCopySchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(8000),
  })
  .strict();

export type SendBroadcastInput = z.infer<typeof SendBroadcastSchema>;
export type PreviewBroadcastInput = z.infer<typeof PreviewBroadcastSchema>;
