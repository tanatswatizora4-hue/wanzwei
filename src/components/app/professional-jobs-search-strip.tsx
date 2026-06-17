"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";

/** Shared typography + segmented layout for Browse Jobs search row. */
const SEGMENT_TRIGGER = cn(
  "h-10 min-h-10 w-full rounded-none border-0 bg-transparent shadow-none transition-none",
  "px-4 text-[13px] leading-none font-normal text-[color:var(--color-ink-900)]",
  "justify-between gap-2",
  "focus:ring-[3px] focus:ring-inset focus:ring-[color:var(--color-brand-100)] focus:outline-none",
  "focus:border-0 [&>span:first-of-type]:min-w-0 [&>span:first-of-type]:flex-1 [&>span:first-of-type]:truncate [&>span:first-of-type]:text-left",
);

export function ProfessionalJobsSearchStrip() {
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-[color:var(--color-border-default)] overflow-hidden rounded-[var(--radius-md)]",
        "border border-[color:var(--color-border-default)] bg-white shadow-[var(--shadow-xs)]",
        "sm:flex-row sm:divide-x sm:divide-y-0 sm:divide-[color:var(--color-border-default)]",
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
          name="jobs-q"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search roles, skills, facilities…"
          className={cn(
            "h-10 min-h-10 rounded-none border-0 px-3.5 pl-9 shadow-none ring-0",
            "text-[13px] text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-300)]",
            "focus-visible:border-0 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[color:var(--color-brand-100)]",
          )}
        />
      </div>

      <Select defaultValue="all-types">
        <SelectTrigger
          aria-label="Job type"
          className={cn(SEGMENT_TRIGGER, "sm:flex-none sm:w-[152px]")}
        >
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent align="start" position="popper">
          <SelectItem value="all-types">All types</SelectItem>
          <SelectItem value="full-time">Full-time</SelectItem>
          <SelectItem value="part-time">Part-time</SelectItem>
          <SelectItem value="locum">Locum</SelectItem>
          <SelectItem value="contract">Contract</SelectItem>
          <SelectItem value="permanent">Permanent</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="all-locations">
        <SelectTrigger
          aria-label="Location"
          className={cn(SEGMENT_TRIGGER, "sm:flex-none sm:w-[152px]")}
        >
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent align="start" position="popper">
          <SelectItem value="all-locations">All locations</SelectItem>
          <SelectItem value="harare">Harare</SelectItem>
          <SelectItem value="bulawayo">Bulawayo</SelectItem>
          <SelectItem value="mutare">Mutare</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
