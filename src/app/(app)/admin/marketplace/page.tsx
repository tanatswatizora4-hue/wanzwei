import { MarketplaceView } from "@/components/app/marketplace-view";
import { listListings } from "@/lib/repos/listings";
import { requireRole } from "@/lib/auth/session";

export default async function AdminMarketplacePage() {
  await requireRole(["admin"]);
  const listings = await listListings();
  return <MarketplaceView listings={listings} />;
}
