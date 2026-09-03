"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { catalogueCoverClass } from "@/lib/catalogue/cover";
import { hasDbConfig } from "@/lib/db/client";
import {
  canCreateListing,
  canManageListing,
  canSendListingEnquiry,
} from "@/lib/marketplace/ownership";
import { createNotification } from "@/lib/repos/notifications";
import {
  createListing,
  getListingById,
  updateListingForOwner,
} from "@/lib/repos/listings";
import {
  createListingEnquiry,
  userAlreadyEnquired,
} from "@/lib/repos/listing-enquiries";
import { ServerActionValidationError } from "@/lib/validation/errors";
import {
  CreateListingEnquirySchema,
  CreateListingSchema,
  UpdateListingSchema,
} from "@/lib/validation/marketplace";

const DEFAULT_COVER = "from-sky-500 to-slate-800";

function revalidateMarketplace(listingId?: string) {
  revalidatePath("/professional/marketplace");
  revalidatePath("/facility/marketplace");
  revalidatePath("/admin/marketplace");
  if (listingId) {
    revalidatePath(`/professional/marketplace/${listingId}`);
    revalidatePath(`/facility/marketplace/${listingId}`);
    revalidatePath(`/admin/marketplace/${listingId}`);
  }
}

function listingFields(formData: FormData) {
  return {
    title: formData.get("title"),
    kind: formData.get("kind"),
    mode: formData.get("mode"),
    location: formData.get("location"),
    price: formData.get("price"),
    currency: formData.get("currency") || "USD",
    beds: formData.get("beds"),
    rooms: formData.get("rooms"),
    staff: formData.get("staff"),
    cover: formData.get("cover") || undefined,
    description: formData.get("description"),
    confidential: formData.get("confidential"),
    status: formData.get("status") || "Open",
  };
}

export async function createListingAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireRole(["facility", "admin"]);
  if (!canCreateListing({ actor: user })) {
    return actionError("You cannot create marketplace listings.");
  }
  if (!hasDbConfig()) {
    return actionError("Database is not configured.");
  }

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
  const user = await requireRole(["facility", "admin"]);
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
  if (
    !canManageListing({
      actor: user,
      listingOwnerId: existing.ownerId,
    })
  ) {
    return actionError("You cannot edit this listing.");
  }

  const updated = await updateListingForOwner(
    parsed.data.id,
    user.id,
    {
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
    },
    user.role === "admin",
  );
  if (!updated) {
    return actionError("Could not update this listing.");
  }

  revalidateMarketplace(parsed.data.id);
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
  if (listing.status !== "Open") {
    return actionError("This listing is not accepting enquiries.");
  }
  if (
    !canSendListingEnquiry({
      actor: user,
      listingOwnerId: listing.ownerId,
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
