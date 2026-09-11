import {
  canManageListing,
  listingVisiblePublicly,
  type ListingActor,
  type ListingSellerType,
} from "@/lib/marketplace/ownership";

export function canViewListingDetail(input: {
  actor: ListingActor | null;
  status: string | null | undefined;
  listingOwnerId: string | null | undefined;
  listingSellerType?: ListingSellerType | null;
  listingFacilityId?: string | null;
  actorFacilityIds?: string[];
  activeWorkspaceType?: "professional" | "facility" | "admin";
}): boolean {
  if (listingVisiblePublicly(input.status)) return true;
  return canManageListing(input);
}
