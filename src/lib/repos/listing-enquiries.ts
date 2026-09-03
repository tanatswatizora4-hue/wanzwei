import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { listingEnquiries, listings } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbListingEnquiry, NewDbListingEnquiry } from "@/lib/db/schema";
import type { ListingEnquiry } from "@/lib/types";

export function toListingEnquiry(row: DbListingEnquiry): ListingEnquiry {
  return {
    id: row.id,
    listingId: row.listingId,
    fromUserId: row.fromUserId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createListingEnquiry(
  enquiry: NewDbListingEnquiry,
): Promise<ListingEnquiry | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "listing_enquiries",
    "createListingEnquiry",
    async () => {
      const db = getDb();
      const rows = await db.insert(listingEnquiries).values(enquiry).returning();
      return rows[0] ? toListingEnquiry(rows[0]) : null;
    },
    { listingId: enquiry.listingId, fromUserId: enquiry.fromUserId },
  );
}

export async function listEnquiriesForListing(
  listingId: string,
  viewer: { id: string; role: "professional" | "facility" | "admin" },
): Promise<ListingEnquiry[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "listing_enquiries",
    "listEnquiriesForListing",
    async () => {
      const db = getDb();
      const listingRows = await db
        .select({ ownerId: listings.ownerId })
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1);
      const ownerId = listingRows[0]?.ownerId ?? null;
      const canSeeAll =
        viewer.role === "admin" || (ownerId != null && ownerId === viewer.id);
      if (!canSeeAll) return [];

      const rows = await db
        .select()
        .from(listingEnquiries)
        .where(eq(listingEnquiries.listingId, listingId))
        .orderBy(desc(listingEnquiries.createdAt));
      return rows.map(toListingEnquiry);
    },
    { listingId, viewerId: viewer.id },
  );
}

export async function userAlreadyEnquired(
  listingId: string,
  fromUserId: string,
): Promise<boolean> {
  if (!hasDbConfig()) return false;
  return withRepositoryLogging(
    "listing_enquiries",
    "userAlreadyEnquired",
    async () => {
      const db = getDb();
      const rows = await db
        .select({ id: listingEnquiries.id })
        .from(listingEnquiries)
        .where(
          and(
            eq(listingEnquiries.listingId, listingId),
            eq(listingEnquiries.fromUserId, fromUserId),
          ),
        )
        .limit(1);
      return Boolean(rows[0]);
    },
    { listingId, fromUserId },
  );
}
