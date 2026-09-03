import Link from "next/link";
import {
  Bed,
  Building2,
  DoorOpen,
  Lock,
  MapPin,
  Store,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { MarketplaceEnquiryDialog } from "@/components/app/marketplace-enquiry-dialog";
import { MarketplaceListingDialog } from "@/components/app/marketplace-listing-dialog";
import { MarketplaceSearchStrip } from "@/components/app/marketplace-search-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { money } from "@/lib/format";
import type { MarketplaceSearchFilters } from "@/lib/marketplace/search";
import type { Listing, User } from "@/lib/types";

const KIND_TONE: Record<
  string,
  "violet" | "emerald" | "amber" | "sky" | "rose"
> = {
  Hospital: "violet",
  Clinic: "rose",
  Pharmacy: "sky",
  Laboratory: "emerald",
  Practice: "amber",
};

export function MarketplaceView({
  listings,
  filters,
  basePath,
  viewer,
  canCreate,
}: {
  listings: Listing[];
  filters: MarketplaceSearchFilters;
  basePath: string;
  viewer: User;
  canCreate: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Healthcare Marketplace"
        description="Enquiry-based listings for buying, selling, or leasing healthcare practices. Wanzwei does not process payments or orders."
        actions={
          canCreate ? (
            <MarketplaceListingDialog />
          ) : null
        }
      />

      <Card>
        <CardBody className="pt-5">
          <MarketplaceSearchStrip
            action={basePath}
            filters={filters}
            showMine={canCreate}
          />
        </CardBody>
      </Card>

      {listings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Store className="h-4 w-4" />}
            title="No listings match these filters"
            description="Try another search, or clear filters to see open listings."
            action={
              filters.q || filters.kind || filters.mode || filters.price || filters.mine ? (
                <Link
                  href={basePath}
                  className="text-[13px] font-medium text-[color:var(--color-brand-600)] hover:underline"
                >
                  Clear search
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              href={`${basePath}/${listing.id}`}
              viewer={viewer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({
  listing,
  href,
  viewer,
}: {
  listing: Listing;
  href: string;
  viewer: User;
}) {
  const canEnquire =
    listing.status === "Open" && listing.ownerId !== viewer.id;
  return (
    <Card className="card-hover flex min-w-0 flex-col overflow-hidden">
      <div
        className={`relative h-32 bg-gradient-to-br ${listing.cover}`}
        aria-hidden
      >
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
          {listing.confidential ? (
            <Badge tone="slate" className="bg-black/30 text-white">
              <Lock className="h-3 w-3" /> Confidential
            </Badge>
          ) : null}
          <Badge
            tone={listing.mode === "Sale" ? "amber" : "sky"}
            className="bg-white/95 backdrop-blur"
          >
            For {listing.mode}
          </Badge>
        </div>
        <div className="absolute left-3 bottom-3">
          <Badge tone={KIND_TONE[listing.kind] ?? "slate"}>
            <Building2 className="h-3 w-3" /> {listing.kind}
          </Badge>
        </div>
      </div>
      <CardBody className="flex flex-1 flex-col gap-2 pt-4">
        <h3 className="text-[14.5px] font-semibold leading-tight tracking-tight">
          {listing.title}
        </h3>
        <p className="inline-flex items-center gap-1 text-[12.5px] text-[color:var(--color-ink-500)]">
          <MapPin className="h-3 w-3" /> {listing.location}
        </p>
        <p className="line-clamp-2 text-[12.5px] text-[color:var(--color-ink-500)]">
          {listing.description}
        </p>
        <p className="text-[12px] text-[color:var(--color-ink-500)]">
          {listing.ownerName
            ? `Listed by ${listing.ownerName}`
            : "Seller identity is not assigned"}
        </p>
        <div className="mt-1 flex flex-wrap gap-3 text-[11.5px] text-[color:var(--color-ink-500)]">
          {listing.beds ? (
            <span className="inline-flex items-center gap-1">
              <Bed className="h-3 w-3" /> {listing.beds} beds
            </span>
          ) : null}
          {listing.rooms ? (
            <span className="inline-flex items-center gap-1">
              <DoorOpen className="h-3 w-3" /> {listing.rooms} rooms
            </span>
          ) : null}
          {listing.staff ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {listing.staff} staff
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-[color:var(--color-ink-400)]">
              {listing.mode === "Sale" ? "Asking price" : "Monthly lease"}
            </p>
            <p className="text-[18px] font-semibold tracking-tight">
              {money(listing.price, listing.currency)}
              {listing.mode === "Lease" ? (
                <span className="text-[11px] font-normal text-[color:var(--color-ink-400)]">
                  {" "}
                  / mo
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={href}>Details</Link>
            </Button>
            {canEnquire ? (
              <MarketplaceEnquiryDialog
                listingId={listing.id}
                listingTitle={listing.title}
                defaultName={viewer.name}
                defaultEmail={viewer.email}
              />
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
