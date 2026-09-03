import "server-only";

import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";

import { catalogueCoverClass } from "@/lib/catalogue/cover";
import { getDb, hasDbConfig } from "@/lib/db/client";
import { listings, users } from "@/lib/db/schema";
import {
  likeContainsPattern,
  priceBounds,
  type MarketplaceSearchFilters,
} from "@/lib/marketplace/search";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbListing, NewDbListing } from "@/lib/db/schema";
import type { Listing } from "@/lib/types";

const DEFAULT_COVER = "from-sky-500 to-slate-800";

export function toListing(
  row: DbListing,
  ownerName?: string | null,
): Listing {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    mode: row.mode,
    location: row.location,
    price: Number(row.price),
    currency: row.currency,
    beds: row.beds ?? undefined,
    rooms: row.rooms ?? undefined,
    staff: row.staff ?? undefined,
    posted: row.posted.toISOString(),
    cover: catalogueCoverClass(row.cover, DEFAULT_COVER),
    description: row.description,
    confidential: row.confidential,
    ownerId: row.ownerId ?? undefined,
    ownerName: ownerName ?? undefined,
    status: row.status,
  };
}

function listingSearchWhere(filters?: MarketplaceSearchFilters, ownerId?: string) {
  const clauses = [];
  if (filters?.mine && ownerId) {
    clauses.push(eq(listings.ownerId, ownerId));
  } else {
    clauses.push(eq(listings.status, "Open"));
  }
  if (filters?.kind) {
    clauses.push(eq(listings.kind, filters.kind));
  }
  if (filters?.mode) {
    clauses.push(eq(listings.mode, filters.mode));
  }
  const bounds = priceBounds(filters?.price);
  if (bounds.min != null) {
    clauses.push(gte(listings.price, String(bounds.min)));
  }
  if (bounds.max != null) {
    clauses.push(lte(listings.price, String(bounds.max)));
  }
  if (filters?.q) {
    const pattern = likeContainsPattern(filters.q);
    clauses.push(
      or(
        ilike(listings.title, pattern),
        ilike(listings.location, pattern),
        ilike(listings.description, pattern),
      )!,
    );
  }
  return and(...clauses);
}

export async function listListings(
  limit = 50,
  filters?: MarketplaceSearchFilters,
  viewerId?: string,
): Promise<Listing[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "listings",
    "listListings",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          listing: listings,
          ownerName: users.name,
        })
        .from(listings)
        .leftJoin(users, eq(users.id, listings.ownerId))
        .where(listingSearchWhere(filters, viewerId))
        .orderBy(desc(listings.posted))
        .limit(limit);
      return rows.map((row) => toListing(row.listing, row.ownerName));
    },
    { limit, filters, viewerId },
  );
}

export async function getListingById(id: string): Promise<Listing | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("listings", "getListingById", async () => {
    const db = getDb();
    const rows = await db
      .select({
        listing: listings,
        ownerName: users.name,
      })
      .from(listings)
      .leftJoin(users, eq(users.id, listings.ownerId))
      .where(eq(listings.id, id))
      .limit(1);
    return rows[0] ? toListing(rows[0].listing, rows[0].ownerName) : null;
  }, { id });
}

export async function createListing(
  listing: NewDbListing,
): Promise<Listing | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("listings", "createListing", async () => {
    const db = getDb();
    const rows = await db.insert(listings).values(listing).returning();
    return rows[0] ? toListing(rows[0]) : null;
  });
}

export async function updateListingForOwner(
  id: string,
  ownerId: string | null,
  patch: Partial<NewDbListing>,
  asAdmin: boolean,
): Promise<Listing | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "listings",
    "updateListingForOwner",
    async () => {
      const db = getDb();
      const where = asAdmin
        ? eq(listings.id, id)
        : and(eq(listings.id, id), eq(listings.ownerId, ownerId ?? ""));
      const rows = await db.update(listings).set(patch).where(where).returning();
      return rows[0] ? toListing(rows[0]) : null;
    },
    { id, ownerId, asAdmin },
  );
}
