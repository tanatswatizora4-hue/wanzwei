import { z } from "zod";

export const ListingKindSchema = z.enum([
  "Clinic",
  "Pharmacy",
  "Hospital",
  "Laboratory",
  "Practice",
]);

export const ListingModeSchema = z.enum(["Sale", "Lease"]);

export const ListingStatusSchema = z.enum(["Open", "Closed"]);

export const CreateListingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  kind: ListingKindSchema,
  mode: ListingModeSchema,
  location: z.string().trim().min(1, "Location is required").max(160),
  price: z.coerce.number().min(0).max(1_000_000_000),
  currency: z.string().trim().min(1).max(8).default("USD"),
  beds: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(0).max(10_000).optional(),
  ),
  rooms: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(0).max(10_000).optional(),
  ),
  staff: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(0).max(10_000).optional(),
  ),
  cover: z.string().trim().max(160).optional(),
  description: z.string().trim().min(1, "Description is required").max(5000),
  confidential: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
  status: ListingStatusSchema.default("Open"),
});

export const UpdateListingSchema = CreateListingSchema.extend({
  id: z.uuid("Invalid listing id"),
});

export const ListingIdSchema = z.object({
  listingId: z.uuid("Invalid listing id"),
});

export const CreateListingEnquirySchema = z.object({
  listingId: z.uuid("Invalid listing id"),
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Valid email is required").max(160),
  phone: z.string().trim().max(40).default(""),
  message: z.string().trim().min(1, "Message is required").max(4000),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;
export type CreateListingEnquiryInput = z.infer<
  typeof CreateListingEnquirySchema
>;
