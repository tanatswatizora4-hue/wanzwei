export const LISTING_CATEGORIES = [
  "medical_equipment",
  "clinical_supplies",
  "scrubs_uniforms",
  "books_study",
  "diagnostic_equipment",
  "mobility_rehabilitation",
  "office_facility_equipment",
  "other",
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const LISTING_CATEGORY_LABELS: Record<ListingCategory, string> = {
  medical_equipment: "Medical Equipment",
  clinical_supplies: "Clinical Supplies",
  scrubs_uniforms: "Scrubs & Uniforms",
  books_study: "Books & Study Materials",
  diagnostic_equipment: "Diagnostic Equipment",
  mobility_rehabilitation: "Mobility & Rehabilitation Equipment",
  office_facility_equipment: "Office / Facility Equipment",
  other: "Other",
};

export const LISTING_CONDITIONS = [
  "new",
  "like_new",
  "good",
  "used",
  "not_applicable",
] as const;

export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const LISTING_CONDITION_LABELS: Record<ListingCondition, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  used: "Used",
  not_applicable: "Not Applicable",
};

export const LISTING_PUBLICATION_STATUSES = [
  "Open",
  "Paused",
  "Closed",
  "Draft",
] as const;

export type ListingPublicationStatus = (typeof LISTING_PUBLICATION_STATUSES)[number];
