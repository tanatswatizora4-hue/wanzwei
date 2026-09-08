import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { listCachedMembershipsForUser } from "@/lib/auth/workspace";
import { facilityMemberships } from "@/lib/auth/workspace-model";
import { canManageListing } from "@/lib/marketplace/ownership";
import { checkRateLimit, rateLimitJsonResponse } from "@/lib/rate-limit";
import {
  deleteListingImage,
  getListingImageById,
  insertListingImage,
  listImagesForListing,
  MAX_LISTING_IMAGES,
} from "@/lib/repos/listing-images";
import { getListingById } from "@/lib/repos/listings";
import { createUploadClient, isSupabaseConfigured } from "@/lib/supabase/service";
import {
  LISTING_IMAGES_BUCKET,
  MAX_LISTING_IMAGE_BYTES,
  sanitizeStorageFileName,
  validateProfilePhotoFile,
} from "@/lib/upload-rules";
import { createLogger, withRouteLogging } from "@/lib/observability/logger";

export const runtime = "nodejs";

const logger = createLogger("listing-images");

async function actorCanManage(listingId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, listing: null, allowed: false };
  const listing = await getListingById(listingId);
  if (!listing) return { user, listing: null, allowed: false };
  const memberships = await listCachedMembershipsForUser(user.id);
  const facilityIds = facilityMemberships(memberships)
    .map((item) => item.facilityId)
    .filter((id): id is string => Boolean(id));
  const allowed = canManageListing({
    actor: user,
    listingOwnerId: listing.ownerId,
    listingSellerType: listing.sellerType,
    listingFacilityId: listing.facilityId,
    actorFacilityIds: facilityIds,
  });
  return { user, listing, allowed };
}

export async function POST(req: Request) {
  return withRouteLogging("/api/uploads/listing-images", req, () => handlePOST(req));
}

async function handlePOST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }
  const userPreview = await getCurrentUser();
  if (!userPreview) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rateLimit = await checkRateLimit("upload", `listing-images:${userPreview.id}`);
  if (!rateLimit.success) {
    return rateLimitJsonResponse(rateLimit);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart body" }, { status: 400 });
  }

  const listingId = String(formData.get("listingId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_LISTING_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 5 MB)." }, { status: 400 });
  }

  const { user, listing, allowed } = await actorCanManage(listingId);
  if (!user || !listing || !allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validationMessage = validateProfilePhotoFile(file, buffer);
  if (validationMessage) {
    return NextResponse.json({ error: validationMessage }, { status: 400 });
  }

  const existing = await listImagesForListing(listing.id);
  if (existing.length >= MAX_LISTING_IMAGES) {
    return NextResponse.json(
      { error: "This listing already has the maximum number of images." },
      { status: 400 },
    );
  }

  const supabase = createUploadClient();
  const safeName = sanitizeStorageFileName(file.name);
  const objectPath = `listings/${listing.id}/${user.id}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(objectPath, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    logger.error("listing_image.upload_failed", uploadError, { listingId: listing.id });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const row = await insertListingImage({
    listingId: listing.id,
    ownerId: user.id,
    storagePath: objectPath,
    fileName: file.name,
    contentType: file.type,
    sortOrder: existing.length,
  });
  if (!row) {
    return NextResponse.json({ error: "Could not save image metadata." }, { status: 500 });
  }
  return NextResponse.json({ id: row.id, listingId: listing.id });
}

export async function DELETE(req: Request) {
  return withRouteLogging("/api/uploads/listing-images", req, () => handleDELETE(req));
}

async function handleDELETE(req: Request) {
  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId") ?? "";
  const imageId = url.searchParams.get("imageId") ?? "";
  const { listing, allowed } = await actorCanManage(listingId);
  if (!listing || !allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const image = await getListingImageById(listing.id, imageId);
  if (!image) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isSupabaseConfigured()) {
    const supabase = createUploadClient();
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([image.storagePath]);
  }
  await deleteListingImage({ listingId: listing.id, imageId });
  return NextResponse.json({ ok: true });
}
