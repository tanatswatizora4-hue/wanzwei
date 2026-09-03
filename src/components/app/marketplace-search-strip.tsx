import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { MarketplaceSearchFilters } from "@/lib/marketplace/search";

const KINDS = [
  "",
  "Clinic",
  "Pharmacy",
  "Hospital",
  "Laboratory",
  "Practice",
] as const;

export function MarketplaceSearchStrip({
  action,
  filters,
  showMine,
}: {
  action: string;
  filters: MarketplaceSearchFilters;
  showMine?: boolean;
}) {
  return (
    <form
      method="get"
      action={action}
      className={cn(
        "flex min-w-0 flex-col gap-2",
      )}
      role="search"
      aria-label="Search marketplace"
    >
      <div
        className={cn(
          "flex flex-col divide-y divide-[color:var(--color-border-default)] overflow-hidden rounded-[var(--radius-md)]",
          "border border-[color:var(--color-border-default)] bg-white shadow-[var(--shadow-xs)]",
          "sm:flex-row sm:divide-x sm:divide-y-0",
        )}
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
            placeholder="Search title or location"
            className={cn(
              "h-10 min-h-10 rounded-none border-0 px-3.5 pl-9 shadow-none ring-0",
              "text-[13px] placeholder:text-[color:var(--color-ink-300)]",
              "focus-visible:border-0 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[color:var(--color-brand-100)]",
            )}
          />
        </div>
        <label className="sr-only" htmlFor="listing-kind">
          Type
        </label>
        <select
          id="listing-kind"
          name="kind"
          defaultValue={filters.kind ?? ""}
          className="h-10 min-h-10 w-full bg-transparent px-4 text-[13px] outline-none sm:w-[140px]"
        >
          <option value="">All types</option>
          {KINDS.filter(Boolean).map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="listing-mode">
          Mode
        </label>
        <select
          id="listing-mode"
          name="mode"
          defaultValue={filters.mode ?? ""}
          className="h-10 min-h-10 w-full bg-transparent px-4 text-[13px] outline-none sm:w-[130px]"
        >
          <option value="">Sale or lease</option>
          <option value="Sale">For sale</option>
          <option value="Lease">For lease</option>
        </select>
        <label className="sr-only" htmlFor="listing-price">
          Price
        </label>
        <select
          id="listing-price"
          name="price"
          defaultValue={filters.price ?? ""}
          className="h-10 min-h-10 w-full bg-transparent px-4 text-[13px] outline-none sm:w-[150px]"
        >
          <option value="">Any asking price</option>
          <option value="lt-100k">Under $100k</option>
          <option value="100k-500k">$100k – $500k</option>
          <option value="500k-plus">$500k+</option>
        </select>
        <div className="flex items-center p-1.5">
          <Button type="submit" size="sm" className="w-full sm:w-auto">
            Search
          </Button>
        </div>
      </div>
      {showMine ? (
        <label className="inline-flex items-center gap-2 text-[13px] text-[color:var(--color-ink-600)]">
          <input
            type="checkbox"
            name="mine"
            value="1"
            defaultChecked={filters.mine === true}
          />
          My listings only
        </label>
      ) : null}
    </form>
  );
}
