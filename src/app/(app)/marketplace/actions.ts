"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { isVerifiedProfessional } from "@/lib/auth/professional-verification";
import { requireRole } from "@/lib/auth/session";
import { marketplaceActorScope } from "@/lib/marketplace/actor-scope";
import { catalogueCoverClass } from "@/lib/catalogue/cover";
import { hasDbConfig } from "@/lib/db/client";
import {
  canManageListing,
  canSendListingEnquiry,
  listingVisiblePublicly,
} from "@/lib/marketplace/ownership";
import { requireFacilityCapability } from "@/lib/facility-for-user";
import { createNotification } from "@/lib/repos/notifications";
import {
  createListing,
  deleteListingById,
  getListingById,
  updateListingById,
} from "@/lib/repos/listings";
import {
  createListingEnquiry,
  userAlreadyEnquired,
} from "@/lib/repos/listing-enquiries";
import { ServerActionValidationError } from "@/lib/validation/errors";
import {
  CreateListingEnquirySchema,
  CreateListingSchema,
  ListingIdSchema,
  ListingStatusSchema,
  UpdateListingSchema,
} from "@/lib/validation/marketplace";

const DEFAULT_COVER = "from-sky-500 to-slate-800";

function revalidateMarketplace(listingId?: string) {
  revalidatePath("/professional/marketplace");
  revalidatePath("/facility/marketplace");
  revalidatePath("/admin/marketplace");
  revalidatePath("/professional/marketplace/mine");
  revalidatePath("/facility/marketplace/mine");
  if (listingId) {
    revalidatePath(`/professional/marketplace/${listingId}`);
    revalidatePath(`/facility/marketplace/${listingId}`);
    revalidatePath(`/admin/marketplace/${listingId}`);
  }
}

function listingFields(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    condition: formData.get("condition"),
    location: formData.get("location"),
    price: formData.get("price"),
    currency: formData.get("currency") || "USD",
    status: formData.get("status") || "Open",
    kind: formData.get("kind") || "Practice",
    mode: formData.get("mode") || "Sale",
    beds: formData.get("beds"),
    rooms: formData.get("rooms"),
    staff: formData.get("staff"),
    cover: formData.get("cover") || undefined,
    confidential: formData.get("confidential"),
  };
}

export async function createListingAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["professional", "facility", "admin"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const listingContext = String(formData.get("listingContext") ?? "");
  if (listingContext === "facility") {
    const context = await requireFacilityCapability(user, "manageMarketplace");
    if (!context) {
      return actionError(
        "Switch to a facility workspace with listing permission to create facility listings.",
      );
    }
    const facilityId = context.facilityId;
    const parsed = CreateListingSchema.safeParse(listingFields(formData));
    if (!parsed.success) {
      throw new ServerActionValidationError(parsed.error);
    }
    const created = await createListing({
      title: parsed.data.title,
      kind: parsed.data.kind,
      mode: parsed.data.mode,
      location: parsed.data.location,
      price: String(parsed.data.price),
      currency: parsed.data.currency,
      beds: parsed.data.beds ?? null,
      rooms: parsed.data.rooms ?? null,
      staff: parsed.data.staff ?? null,
      cover: catalogueCoverClass(parsed.data.cover, DEFAULT_COVER),
      description: parsed.data.description,
      confidential: parsed.data.confidential,
      ownerId: user.id,
      status: parsed.data.status,
      category: parsed.data.category,
      condition: parsed.data.condition,
      sellerType: "facility",
      facilityId,
    });
    if (!created) {
      return actionError("Could not create this listing.");
    }
    revalidateMarketplace(created.id);
    return actionOk();
  }

  if (listingContext !== "admin" && user.role !== "admin") {
    const scope = await marketplaceActorScope(user);
    if (scope.activeWorkspaceType !== "professional") {
      return actionError(
        "Switch to your professional profile to create a personal listing.",
      );
    }
    if (
      !isVerifiedProfessional(user, { professionalMembership: true })
    ) {
      return actionError("You cannot create marketplace listings.");
    }
  } else if (user.role !== "admin") {
    return actionError("You cannot create marketplace listings.");
  }

  const parsed = CreateListingSchema.safeParse(listingFields(formData));
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const seller =
    user.role === "admin"
      ? { sellerType: null, facilityId: null, ownerId: user.id }
      : {
          sellerType: "professional" as const,
          facilityId: null,
          ownerId: user.id,
        };

  const created = await createListing({
    title: parsed.data.title,
    kind: parsed.data.kind,
    mode: parsed.data.mode,
    location: parsed.data.location,
    price: String(parsed.data.price),
    currency: parsed.data.currency,
    beds: parsed.data.beds ?? null,
    rooms: parsed.data.rooms ?? null,
    staff: parsed.data.staff ?? null,
    cover: catalogueCoverClass(parsed.data.cover, DEFAULT_COVER),
    description: parsed.data.description,
    confidential: parsed.data.confidential,
    ownerId: seller.ownerId,
    status: parsed.data.status,
    category: parsed.data.category,
    condition: parsed.data.condition,
    sellerType: seller.sellerType,
    facilityId: seller.facilityId,
  });
  if (!created) {
    return actionError("Could not create this listing.");
  }

  revalidateMarketplace(created.id);
  return actionOk();
}

export async function updateListingAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["professional", "facility", "admin"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = UpdateListingSchema.safeParse({
    id: formData.get("id"),
    ...listingFields(formData),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const existing = await getListingById(parsed.data.id);
  if (!existing) {
    return actionError("Listing not found.");
  }
  const scope = await marketplaceActorScope(user);
  if (
    !canManageListing({
      actor: user,
      listingOwnerId: existing.ownerId,
      listingSellerType: existing.sellerType,
      listingFacilityId: existing.facilityId,
      actorFacilityIds: scope.mutateFacilityIds,
      activeWorkspaceType: scope.activeWorkspaceType,
    })
  ) {
    return actionError("You cannot edit this listing.");
  }

  const updated = await updateListingById(parsed.data.id, {
    title: parsed.data.title,
    kind: parsed.data.kind,
    mode: parsed.data.mode,
    location: parsed.data.location,
    price: String(parsed.data.price),
    currency: parsed.data.currency,
    beds: parsed.data.beds ?? null,
    rooms: parsed.data.rooms ?? null,
    staff: parsed.data.staff ?? null,
    cover: catalogueCoverClass(parsed.data.cover, DEFAULT_COVER),
    description: parsed.data.description,
    confidential: parsed.data.confidential,
    status: parsed.data.status,
    category: parsed.data.category,
    condition: parsed.data.condition,
  });
  if (!updated) {
    return actionError("Could not update this listing.");
  }

  revalidateMarketplace(parsed.data.id);
  return actionOk();
}

export async function setListingStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["professional", "facility", "admin"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }
  const parsed = ListingIdSchema.extend({
    status: ListingStatusSchema,
  }).safeParse({
    listingId: formData.get("listingId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }
  const existing = await getListingById(parsed.data.listingId);
  if (!existing) {
    return actionError("Listing not found.");
  }
  const scope = await marketplaceActorScope(user);
  if (
    !canManageListing({
      actor: user,
      listingOwnerId: existing.ownerId,
      listingSellerType: existing.sellerType,
      listingFacilityId: existing.facilityId,
      actorFacilityIds: scope.mutateFacilityIds,
      activeWorkspaceType: scope.activeWorkspaceType,
    })
  ) {
    return actionError("You cannot update this listing.");
  }
  const updated = await updateListingById(existing.id, {
    status: parsed.data.status,
  });
  if (!updated) {
    return actionError("Could not update this listing.");
  }
  revalidateMarketplace(existing.id);
  return actionOk();
}

export async function deleteListingAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["professional", "facility", "admin"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }
  const parsed = ListingIdSchema.safeParse({
    listingId: formData.get("listingId"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }
  const existing = await getListingById(parsed.data.listingId);
  if (!existing) {
    return actionError("Listing not found.");
  }
  const scope = await marketplaceActorScope(user);
  if (
    !canManageListing({
      actor: user,
      listingOwnerId: existing.ownerId,
      listingSellerType: existing.sellerType,
      listingFacilityId: existing.facilityId,
      actorFacilityIds: scope.mutateFacilityIds,
      activeWorkspaceType: scope.activeWorkspaceType,
    })
  ) {
    return actionError("You cannot delete this listing.");
  }
  const deleted = await deleteListingById(existing.id);
  if (!deleted) {
    return actionError("Could not delete this listing.");
  }
  revalidateMarketplace(existing.id);
  return actionOk();
}

export async function sendListingEnquiryAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["professional", "facility", "admin"]);
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  const parsed = CreateListingEnquirySchema.safeParse({
    listingId: formData.get("listingId"),
    name: formData.get("name") || user.name,
    email: formData.get("email") || user.email,
    phone: formData.get("phone") ?? "",
    message: formData.get("message"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const listing = await getListingById(parsed.data.listingId);
  if (!listing) {
    return actionError("Listing not found.");
  }
  if (!listingVisiblePublicly(listing.status)) {
    return actionError("This listing is not accepting enquiries.");
  }
  const scope = await marketplaceActorScope(user);
  if (
    !canSendListingEnquiry({
      actor: user,
      listingOwnerId: listing.ownerId,
      listingFacilityId: listing.facilityId,
      actorFacilityIds: scope.identityFacilityIds,
    })
  ) {
    return actionError("You cannot enquire on your own listing.");
  }

  const already = await userAlreadyEnquired(listing.id, user.id);
  if (already) {
    return actionError("You have already sent an enquiry for this listing.");
  }

  const created = await createListingEnquiry({
    listingId: listing.id,
    fromUserId: user.id,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    message: parsed.data.message,
  });
  if (!created) {
    return actionError("Could not send this enquiry.");
  }

  if (listing.ownerId) {
    await createNotification({
      userId: listing.ownerId,
      title: "Marketplace enquiry",
      body: `${parsed.data.name} sent an enquiry about “${listing.title}”. Open the listing to read it.`,
      kind: "system",
    });
  }

  revalidateMarketplace(listing.id);
  return actionOk();
}
