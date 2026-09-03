import Link from "next/link";
import {
  ArrowLeft,
  Bed,
  Building2,
  DoorOpen,
  Lock,
  MapPin,
  Users,
} from "lucide-react";

import { MarketplaceEnquiryDialog } from "@/components/app/marketplace-enquiry-dialog";
import { MarketplaceListingDialog } from "@/components/app/marketplace-listing-dialog";
import { PageHeader } from "@/components/app/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { money } from "@/lib/format";
import { canManageListing, canSendListingEnquiry } from "@/lib/marketplace/ownership";
import type { Listing, ListingEnquiry, User } from "@/lib/types";

export function MarketplaceDetailView({
  listing,
  viewer,
  backHref,
  enquiries,
}: {
  listing: Listing;
  viewer: User;
  backHref: string;
  enquiries: ListingEnquiry[];
}) {
  const canManage = canManageListing({
    actor: viewer,
    listingOwnerId: listing.ownerId,
  });
  const canEnquire =
    listing.status === "Open" &&
    canSendListingEnquiry({
      actor: viewer,
      listingOwnerId: listing.ownerId,
    });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={listing.title}
        description={`${listing.kind} · ${listing.location}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? <MarketplaceListingDialog listing={listing} /> : null}
            <Button variant="secondary" size="sm" asChild>
              <Link href={backHref}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back to marketplace
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div
          className={`h-40 bg-gradient-to-br ${listing.cover}`}
          aria-hidden
        />
        <CardBody className="flex min-w-0 flex-col gap-4 pt-5">
          <div className="flex flex-wrap gap-2">
            <Badge>
              <Building2 className="h-3 w-3" /> {listing.kind}
            </Badge>
            <Badge tone={listing.mode === "Sale" ? "amber" : "sky"}>
              For {listing.mode}
            </Badge>
            <Badge tone={listing.status === "Open" ? "emerald" : "slate"}>
              {listing.status}
            </Badge>
            {listing.confidential ? (
              <Badge tone="slate">
                <Lock className="h-3 w-3" /> Confidential
              </Badge>
            ) : null}
          </div>
          <p className="text-[13px] text-[color:var(--color-ink-500)]">
            {listing.ownerName
              ? `Listed by ${listing.ownerName}`
              : "Seller identity is not assigned"}
          </p>
          <p className="text-[22px] font-semibold tracking-tight">
            {money(listing.price, listing.currency)}
            {listing.mode === "Lease" ? (
              <span className="text-[13px] font-normal text-[color:var(--color-ink-400)]">
                {" "}
                / month
              </span>
            ) : null}
          </p>
          <p className="inline-flex items-center gap-1 text-[13px] text-[color:var(--color-ink-500)]">
            <MapPin className="h-3.5 w-3.5" /> {listing.location}
          </p>
          <div className="flex flex-wrap gap-4 text-[13px] text-[color:var(--color-ink-500)]">
            {listing.beds != null ? (
              <span className="inline-flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" /> {listing.beds} beds
              </span>
            ) : null}
            {listing.rooms != null ? (
              <span className="inline-flex items-center gap-1">
                <DoorOpen className="h-3.5 w-3.5" /> {listing.rooms} rooms
              </span>
            ) : null}
            {listing.staff != null ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {listing.staff} staff
              </span>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-[14px] leading-6 text-[color:var(--color-ink-700)]">
            {listing.description}
          </p>
          <p className="rounded-[var(--radius-md)] bg-[color:var(--color-surface-muted)] px-3 py-3 text-[12.5px] text-[color:var(--color-ink-500)]">
            This marketplace is enquiry-based. There is no checkout, payment,
            inventory, rating, or order flow in Wanzwei.
          </p>
          {canEnquire ? (
            <MarketplaceEnquiryDialog
              listingId={listing.id}
              listingTitle={listing.title}
              defaultName={viewer.name}
              defaultEmail={viewer.email}
            />
          ) : listing.ownerId === viewer.id ? (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              This is your listing. Incoming enquiries appear below when you are
              the assigned owner.
            </p>
          ) : listing.status !== "Open" ? (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              This listing is closed and is not accepting enquiries.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {canManage ? (
        <Card>
          <CardBody className="pt-5">
            <h2 className="text-[15px] font-semibold">Enquiries</h2>
            {enquiries.length === 0 ? (
              <p className="mt-2 text-[13px] text-[color:var(--color-ink-500)]">
                No enquiries have been stored for this listing yet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {enquiries.map((enquiry) => (
                  <li
                    key={enquiry.id}
                    className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] p-3"
                  >
                    <p className="text-[13px] font-medium">{enquiry.name}</p>
                    <p className="text-[12px] text-[color:var(--color-ink-500)]">
                      {enquiry.email}
                      {enquiry.phone ? ` · ${enquiry.phone}` : ""}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-[13px]">
                      {enquiry.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
