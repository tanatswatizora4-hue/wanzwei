import "server-only";

import { notFound } from "next/navigation";

import { listCachedMembershipsForUser } from "@/lib/auth/workspace";
import { facilityMemberships } from "@/lib/auth/workspace-model";
import { parseUuid } from "@/lib/ids";
import { canViewListingDetail } from "@/lib/marketplace/listing-access";
import { listEnquiriesForListing } from "@/lib/repos/listing-enquiries";
import { listSignedListingImages } from "@/lib/repos/listing-images";
import { getListingById } from "@/lib/repos/listings";
import type { Listing, ListingEnquiry, User } from "@/lib/types";
import type { ListingImageView } from "@/lib/marketplace/listing-image-types";

export async function loadMarketplaceListingPage(
  user: User,
  rawId: string,
): Promise<{
  listing: Listing;
  enquiries: ListingEnquiry[];
  actorFacilityIds: string[];
  images: ListingImageView[];
}> {
  const listingId = parseUuid(rawId);
  if (!listingId) notFound();
  const listing = await getListingById(listingId);
  if (!listing) notFound();
  const memberships = await listCachedMembershipsForUser(user.id);
  const actorFacilityIds = facilityMemberships(memberships)
    .map((item) => item.facilityId)
    .filter((id): id is string => Boolean(id));
  if (
    !canViewListingDetail({
      actor: user,
      status: listing.status,
      listingOwnerId: listing.ownerId,
      listingSellerType: listing.sellerType,
      listingFacilityId: listing.facilityId,
      actorFacilityIds,
    })
  ) {
    notFound();
  }
  const [enquiries, images] = await Promise.all([
    listEnquiriesForListing(listing.id, user),
    listSignedListingImages(listing.id),
  ]);
  return { listing, enquiries, actorFacilityIds, images };
}
