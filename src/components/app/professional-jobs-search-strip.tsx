"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { JobSearchFilters } from "@/lib/jobs/search";

const TYPES = [
  "",
  "Full-time",
  "Part-time",
  "Locum",
  "Contract",
  "Permanent",
] as const;

export function ProfessionalJobsSearchStrip({
  filters,
}: {
  filters: JobSearchFilters;
}) {
  return (
    <form
      method="get"
      action="/professional/jobs"
      className={cn(
        "flex flex-col divide-y divide-[color:var(--color-border-default)] overflow-hidden rounded-[var(--radius-md)]",
        "border border-[color:var(--color-border-default)] bg-white shadow-[var(--shadow-xs)]",
        "sm:flex-row sm:divide-x sm:divide-y-0",
      )}
      role="search"
      aria-label="Search jobs"
    >
      <div className="relative flex min-h-10 min-w-0 flex-1 items-center">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 z-[1] h-3.5 w-3.5 shrink-0 -translate-y-1/2 text-[color:var(--color-ink-400)]"
          aria-hidden
        />
        <Input
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search title, facility, or location"
          className={cn(
            "h-10 min-h-10 rounded-none border-0 px-3.5 pl-9 shadow-none ring-0",
            "text-[13px] text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-300)]",
            "focus-visible:border-0 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[color:var(--color-brand-100)]",
          )}
        />
      </div>
      <label className="sr-only" htmlFor="job-type">
        Job type
      </label>
      <select
        id="job-type"
        name="type"
        defaultValue={filters.type ?? ""}
        className="h-10 min-h-10 w-full bg-transparent px-4 text-[13px] text-[color:var(--color-ink-900)] outline-none sm:w-[152px]"
      >
        <option value="">All types</option>
        {TYPES.filter(Boolean).map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="job-location">
        Location
      </label>
      <input
        id="job-location"
        name="location"
        defaultValue={filters.location ?? ""}
        placeholder="Location"
        className="h-10 min-h-10 w-full bg-transparent px-4 text-[13px] text-[color:var(--color-ink-900)] outline-none placeholder:text-[color:var(--color-ink-300)] sm:w-[152px]"
      />
      <div className="flex items-center p-1.5 sm:w-auto">
        <Button type="submit" size="sm" className="w-full sm:w-auto">
          Search
        </Button>
      </div>
    </form>
  );
}
