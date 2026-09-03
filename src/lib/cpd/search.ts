import type { CourseCategory, CourseFormat } from "@/lib/types";

export type CpdSearchFilters = {
  q?: string;
  category?: CourseCategory;
  format?: CourseFormat;
  tab?: "catalogue" | "registered" | "completed";
};

const CATEGORIES: readonly CourseCategory[] = [
  "Clinical",
  "Compliance",
  "Leadership",
  "Tech",
  "Wellbeing",
];

const FORMATS: readonly CourseFormat[] = ["Online", "In person", "Hybrid"];

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function likeContainsPattern(value: string): string {
  const safe = value.replace(/[%_\\]/g, " ").trim();
  return `%${safe}%`;
}

export function parseCpdSearchParams(input: {
  q?: string | string[];
  category?: string | string[];
  format?: string | string[];
  tab?: string | string[];
}): CpdSearchFilters {
  const q = first(input.q)?.trim();
  const categoryRaw = first(input.category)?.trim();
  const formatRaw = first(input.format)?.trim();
  const tabRaw = first(input.tab)?.trim();

  return {
    q: q || undefined,
    category: CATEGORIES.includes(categoryRaw as CourseCategory)
      ? (categoryRaw as CourseCategory)
      : undefined,
    format: FORMATS.includes(formatRaw as CourseFormat)
      ? (formatRaw as CourseFormat)
      : undefined,
    tab:
      tabRaw === "registered" || tabRaw === "completed" || tabRaw === "catalogue"
        ? tabRaw
        : "catalogue",
  };
}

export function cpdSearchQuery(filters: CpdSearchFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.format) params.set("format", filters.format);
  if (filters.tab && filters.tab !== "catalogue") params.set("tab", filters.tab);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
