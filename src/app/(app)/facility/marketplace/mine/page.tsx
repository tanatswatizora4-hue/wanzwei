import { canCreateListing } from "@/lib/marketplace/ownership";
import { MarketplaceView } from "@/components/app/marketplace-view";
import { requireRole } from "@/lib/auth/session";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { parseMarketplaceSearchParams } from "@/lib/marketplace/search";
import { listListings } from "@/lib/repos/listings";

export default async function FacilityMyListingsPage() {
  const user = await requireRole(["facility"]);
  const { workspace } = await resolveWorkspaceForUser(user);
  const filters = parseMarketplaceSearchParams({ mine: "1" });
  const listings =
    workspace?.type === "facility"
      ? await listListings(200, { ...filters, mine: true }, {
          sellerType: "facility",
          facilityId: workspace.facilityId,
        })
      : [];

  return (
    <MarketplaceView
      listings={listings}
      filters={{ ...filters, mine: true }}
      basePath="/facility/marketplace"
      viewer={user}
      canCreate={canCreateListing({ actor: user, workspace })}
    />
  );
}
