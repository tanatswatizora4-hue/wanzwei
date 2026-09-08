import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { listingImages } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { ListingImageView } from "@/lib/marketplace/listing-image-types";
import { createSignedStorageUrl } from "@/lib/supabase/private-storage";
import { LISTING_IMAGES_BUCKET } from "@/lib/upload-rules";
import type { DbListingImage, NewDbListingImage } from "@/lib/db/schema";

export const MAX_LISTING_IMAGES = 8;

export type ListingImage = {
  id: string;
  listingId: string;
  ownerId: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  sortOrder: number;
};

export function toListingImage(row: DbListingImage): ListingImage {
  return {
    id: row.id,
    listingId: row.listingId,
    ownerId: row.ownerId,
    storagePath: row.storagePath,
    fileName: row.fileName,
    contentType: row.contentType,
    sortOrder: row.sortOrder,
  };
}

export async function listImagesForListing(
  listingId: string,
): Promise<ListingImage[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "listing_images",
    "listImagesForListing",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId))
        .orderBy(asc(listingImages.sortOrder), asc(listingImages.createdAt));
      return rows.map(toListingImage);
    },
    { listingId },
  );
}

export async function getListingImageById(
  listingId: string,
  imageId: string,
): Promise<ListingImage | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "listing_images",
    "getListingImageById",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(listingImages)
        .where(
          and(eq(listingImages.id, imageId), eq(listingImages.listingId, listingId)),
        )
        .limit(1);
      return rows[0] ? toListingImage(rows[0]) : null;
    },
    { listingId, imageId },
  );
}

export async function insertListingImage(
  image: NewDbListingImage,
): Promise<ListingImage | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("listing_images", "insertListingImage", async () => {
    const db = getDb();
    const rows = await db.insert(listingImages).values(image).returning();
    return rows[0] ? toListingImage(rows[0]) : null;
  });
}

export async function deleteListingImage(input: {
  listingId: string;
  imageId: string;
}): Promise<ListingImage | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("listing_images", "deleteListingImage", async () => {
    const db = getDb();
    const rows = await db
      .delete(listingImages)
      .where(
        and(
          eq(listingImages.id, input.imageId),
          eq(listingImages.listingId, input.listingId),
        ),
      )
      .returning();
    return rows[0] ? toListingImage(rows[0]) : null;
  }, input);
}

export type { ListingImageView } from "@/lib/marketplace/listing-image-types";

export async function listSignedListingImages(
  listingId: string,
): Promise<ListingImageView[]> {
  const images = await listImagesForListing(listingId);
  const views: ListingImageView[] = [];
  for (const image of images) {
    const url = await createSignedStorageUrl(image.storagePath, {
      bucket: LISTING_IMAGES_BUCKET,
    });
    if (!url) continue;
    views.push({ id: image.id, url, fileName: image.fileName });
  }
  return views;
}
