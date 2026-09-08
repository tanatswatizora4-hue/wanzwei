import { MarketplaceView } from "@/components/app/marketplace-view";
import { requireRole } from "@/lib/auth/session";
import { isVerifiedProfessional } from "@/lib/auth/professional-verification";
import { parseMarketplaceSearchParams } from "@/lib/marketplace/search";
import { listListings } from "@/lib/repos/listings";

export default async function ProfessionalMyListingsPage() {
  const user = await requireRole(["professional"]);
  const filters = parseMarketplaceSearchParams({ mine: "1" });
  const listings = await listListings(200, { ...filters, mine: true }, {
    sellerType: "professional",
    ownerId: user.id,
  });

  return (
    <MarketplaceView
      listings={listings}
      filters={{ ...filters, mine: true }}
      basePath="/professional/marketplace"
      viewer={user}
      canCreate={isVerifiedProfessional(user, { professionalMembership: true })}
    />
  );
}
