import { canCreateListing } from "@/lib/marketplace/ownership";
import { MarketplaceView } from "@/components/app/marketplace-view";
import { requireRole } from "@/lib/auth/session";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { parseMarketplaceSearchParams } from "@/lib/marketplace/search";
import { listListings } from "@/lib/repos/listings";

export default async function FacilityMarketplacePage({
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
  const user = await requireRole(["facility"]);
  const { workspace } = await resolveWorkspaceForUser(user);
  const filters = parseMarketplaceSearchParams(await searchParams);
  const listings = await listListings(
    200,
    filters,
    filters.mine && workspace?.type === "facility"
      ? { sellerType: "facility", facilityId: workspace.facilityId }
      : undefined,
  );

  return (
    <MarketplaceView
      listings={listings}
      filters={filters}
      basePath="/facility/marketplace"
      viewer={user}
      canCreate={canCreateListing({ actor: user, workspace })}
    />
  );
}
