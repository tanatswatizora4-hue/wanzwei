import { notFound } from "next/navigation";

import { MarketplaceDetailView } from "@/components/app/marketplace-detail-view";
import { requireRole } from "@/lib/auth/session";
import { loadMarketplaceListingPage } from "@/lib/marketplace/listing-page";

export default async function AdminMarketplaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["admin"]);
  const { id } = await params;
  const { listing, enquiries, actorFacilityIds, images } =
    await loadMarketplaceListingPage(user, id);
  if (!listing) notFound();

  return (
    <MarketplaceDetailView
      listing={listing}
      viewer={user}
      backHref="/admin/marketplace"
      enquiries={enquiries}
      actorFacilityIds={actorFacilityIds}
      images={images}
      listingContext="admin"
    />
  );
}
