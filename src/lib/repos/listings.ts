import "server-only";

import { desc } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { listings } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbListing, NewDbListing } from "@/lib/db/schema";
import type { Listing } from "@/lib/types";

export function toListing(row: DbListing): Listing {
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
    cover: row.cover,
    description: row.description,
    confidential: row.confidential,
  };
}

export async function listListings(limit = 50): Promise<Listing[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("listings", "listListings", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(listings)
      .orderBy(desc(listings.posted))
      .limit(limit);
    return rows.map(toListing);
  }, { limit });
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
