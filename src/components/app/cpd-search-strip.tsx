import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { CpdSearchFilters } from "@/lib/cpd/search";

const CATEGORIES = [
  "",
  "Clinical",
  "Compliance",
  "Leadership",
  "Tech",
  "Wellbeing",
] as const;

const FORMATS = ["", "Online", "In person", "Hybrid"] as const;

export function CpdSearchStrip({
  action,
  filters,
}: {
  action: string;
  filters: CpdSearchFilters;
}) {
  return (
    <form
      method="get"
      action={action}
      className={cn(
        "flex flex-col divide-y divide-[color:var(--color-border-default)] overflow-hidden rounded-[var(--radius-md)]",
        "border border-[color:var(--color-border-default)] bg-white shadow-[var(--shadow-xs)]",
        "sm:flex-row sm:divide-x sm:divide-y-0",
      )}
      role="search"
      aria-label="Search CPD"
    >
      {filters.tab && filters.tab !== "catalogue" ? (
        <input type="hidden" name="tab" value={filters.tab} />
      ) : null}
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
          placeholder="Search title or provider"
          className={cn(
            "h-10 min-h-10 rounded-none border-0 px-3.5 pl-9 shadow-none ring-0",
            "text-[13px] placeholder:text-[color:var(--color-ink-300)]",
            "focus-visible:border-0 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[color:var(--color-brand-100)]",
          )}
        />
      </div>
      <label className="sr-only" htmlFor="cpd-category">
        Category
      </label>
      <select
        id="cpd-category"
        name="category"
        defaultValue={filters.category ?? ""}
        className="h-10 min-h-10 w-full bg-transparent px-4 text-[13px] outline-none sm:w-[148px]"
      >
        <option value="">All categories</option>
        {CATEGORIES.filter(Boolean).map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="cpd-format">
        Format
      </label>
      <select
        id="cpd-format"
        name="format"
        defaultValue={filters.format ?? ""}
        className="h-10 min-h-10 w-full bg-transparent px-4 text-[13px] outline-none sm:w-[140px]"
      >
        <option value="">Any format</option>
        {FORMATS.filter(Boolean).map((format) => (
          <option key={format} value={format}>
            {format}
          </option>
        ))}
      </select>
      <div className="flex items-center p-1.5">
        <Button type="submit" size="sm" className="w-full sm:w-auto">
          Search
        </Button>
      </div>
    </form>
  );
}
