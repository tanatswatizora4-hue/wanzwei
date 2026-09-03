import { MarketplaceView } from "@/components/app/marketplace-view";
import { requireRole } from "@/lib/auth/session";
import { parseMarketplaceSearchParams } from "@/lib/marketplace/search";
import { listListings } from "@/lib/repos/listings";

export default async function AdminMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    mode?: string;
    price?: string;
    mine?: string;
  }>;
}) {
  const user = await requireRole(["admin"]);
  const filters = parseMarketplaceSearchParams(await searchParams);
  const listings = await listListings(200, filters, user.id);

  return (
    <MarketplaceView
      listings={listings}
      filters={filters}
      basePath="/admin/marketplace"
      viewer={user}
      canCreate
    />
  );
}
