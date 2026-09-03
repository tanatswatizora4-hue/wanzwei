import type { ListingKind, ListingMode } from "@/lib/types";

export type MarketplaceSearchFilters = {
  q?: string;
  kind?: ListingKind;
  mode?: ListingMode;
  price?: "lt-100k" | "100k-500k" | "500k-plus";
  mine?: boolean;
};

const KINDS: readonly ListingKind[] = [
  "Clinic",
  "Pharmacy",
  "Hospital",
  "Laboratory",
  "Practice",
];

const MODES: readonly ListingMode[] = ["Sale", "Lease"];

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function likeContainsPattern(value: string): string {
  const safe = value.replace(/[%_\\]/g, " ").trim();
  return `%${safe}%`;
}

export function priceBounds(
  price: MarketplaceSearchFilters["price"],
): { min?: number; max?: number } {
  if (price === "lt-100k") return { max: 99_999.99 };
  if (price === "100k-500k") return { min: 100_000, max: 500_000 };
  if (price === "500k-plus") return { min: 500_000.01 };
  return {};
}

export function parseMarketplaceSearchParams(input: {
  q?: string | string[];
  kind?: string | string[];
  mode?: string | string[];
  price?: string | string[];
  mine?: string | string[];
}): MarketplaceSearchFilters {
  const q = first(input.q)?.trim();
  const kindRaw = first(input.kind)?.trim();
  const modeRaw = first(input.mode)?.trim();
  const priceRaw = first(input.price)?.trim();
  const mineRaw = first(input.mine)?.trim();

  return {
    q: q || undefined,
    kind: KINDS.includes(kindRaw as ListingKind)
      ? (kindRaw as ListingKind)
      : undefined,
    mode: MODES.includes(modeRaw as ListingMode)
      ? (modeRaw as ListingMode)
      : undefined,
    price:
      priceRaw === "lt-100k" ||
      priceRaw === "100k-500k" ||
      priceRaw === "500k-plus"
        ? priceRaw
        : undefined,
    mine: mineRaw === "1" || mineRaw === "true" ? true : undefined,
  };
}

export function marketplaceSearchQuery(
  filters: MarketplaceSearchFilters,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.mode) params.set("mode", filters.mode);
  if (filters.price) params.set("price", filters.price);
  if (filters.mine) params.set("mine", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
