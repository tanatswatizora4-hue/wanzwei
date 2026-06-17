import { MarketplaceView } from "@/components/app/marketplace-view";
import { listListings } from "@/lib/repos/listings";
import { requireRole } from "@/lib/auth/session";

export default async function ProfessionalMarketplacePage() {
  await requireRole(["professional"]);
  const listings = await listListings();
  return <MarketplaceView listings={listings} />;
}
