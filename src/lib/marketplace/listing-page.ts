import "server-only";

import { notFound } from "next/navigation";

import { parseUuid } from "@/lib/ids";
import { marketplaceActorScope } from "@/lib/marketplace/actor-scope";
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
  activeWorkspaceType: "professional" | "facility" | "admin";
}> {
  const listingId = parseUuid(rawId);
  if (!listingId) notFound();
  const listing = await getListingById(listingId);
  if (!listing) notFound();
  const scope = await marketplaceActorScope(user);
  const viewFacilityIds =
    user.role === "admin"
      ? listing.facilityId
        ? [listing.facilityId]
        : []
      : [...new Set([...scope.mutateFacilityIds, ...scope.identityFacilityIds])];
  if (
    !canViewListingDetail({
      actor: user,
      status: listing.status,
      listingOwnerId: listing.ownerId,
      listingSellerType: listing.sellerType,
      listingFacilityId: listing.facilityId,
      actorFacilityIds: viewFacilityIds,
      activeWorkspaceType: scope.activeWorkspaceType,
    })
  ) {
    notFound();
  }
  const [enquiries, images] = await Promise.all([
    listEnquiriesForListing(listing.id, user),
    listSignedListingImages(listing.id),
  ]);
  return {
    listing,
    enquiries,
    actorFacilityIds: scope.mutateFacilityIds,
    images,
    activeWorkspaceType: scope.activeWorkspaceType,
  };
}
