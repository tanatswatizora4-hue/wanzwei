import type { EmploymentType } from "@/lib/types";
import { EmploymentTypeSchema } from "@/lib/validation/jobs";

export type JobSearchFilters = {
  q?: string;
  location?: string;
  type?: EmploymentType;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Strip LIKE wildcards so user input cannot broaden a filter. */
export function likeContainsPattern(value: string): string {
  const safe = value.replace(/[%_\\]/g, " ").trim();
  return `%${safe}%`;
}

export function parseJobSearchParams(input: {
  q?: string | string[];
  location?: string | string[];
  type?: string | string[];
}): JobSearchFilters {
  const q = first(input.q)?.trim();
  const location = first(input.location)?.trim();
  const typeRaw = first(input.type)?.trim();
  const typeParsed = typeRaw
    ? EmploymentTypeSchema.safeParse(typeRaw)
    : null;

  return {
    q: q || undefined,
    location: location || undefined,
    type: typeParsed?.success ? typeParsed.data : undefined,
  };
}

export function jobSearchQuery(filters: JobSearchFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.location) params.set("location", filters.location);
  if (filters.type) params.set("type", filters.type);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
