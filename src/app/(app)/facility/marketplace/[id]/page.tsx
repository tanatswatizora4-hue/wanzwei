import { notFound } from "next/navigation";

import { MarketplaceDetailView } from "@/components/app/marketplace-detail-view";
import { requireRole } from "@/lib/auth/session";
import { parseUuid } from "@/lib/ids";
import { listEnquiriesForListing } from "@/lib/repos/listing-enquiries";
import { getListingById } from "@/lib/repos/listings";

export default async function FacilityMarketplaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["facility"]);
  const listingId = parseUuid((await params).id);
  if (!listingId) notFound();
  const listing = await getListingById(listingId);
  if (!listing) notFound();
  const enquiries = await listEnquiriesForListing(listing.id, user);

  return (
    <MarketplaceDetailView
      listing={listing}
      viewer={user}
      backHref="/facility/marketplace"
      enquiries={enquiries}
    />
  );
}
