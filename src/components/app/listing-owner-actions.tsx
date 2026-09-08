"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deleteListingAction,
  setListingStatusAction,
} from "@/app/(app)/marketplace/actions";
import { MarketplaceListingDialog } from "@/components/app/marketplace-listing-dialog";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/lib/types";

export function ListingOwnerActions({
  listing,
  listingContext,
}: {
  listing: Listing;
  listingContext: "professional" | "facility" | "admin";
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const run = async (action: () => Promise<{ ok: boolean; error?: string }>) => {
    if (pending) return;
    setPending(true);
    try {
      const result = await action();
      if (result.ok) {
        toast.success("Listing updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update listing.");
    } finally {
      setPending(false);
    }
  };

  const statusForm = (status: string) => {
    const formData = new FormData();
    formData.set("listingId", listing.id);
    formData.set("status", status);
    return formData;
  };

  return (
    <div className="flex flex-wrap gap-2">
      <MarketplaceListingDialog listing={listing} listingContext={listingContext} />
      {listing.status === "Open" ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => setListingStatusAction(statusForm("Paused")))}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Pause
        </Button>
      ) : listing.status === "Paused" || listing.status === "Draft" ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => setListingStatusAction(statusForm("Open")))}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Republish
        </Button>
      ) : null}
      {listing.status !== "Closed" ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => setListingStatusAction(statusForm("Closed")))}
        >
          Mark sold / closed
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          const formData = new FormData();
          formData.set("listingId", listing.id);
          return run(() => deleteListingAction(formData));
        }}
      >
        Delete
      </Button>
    </div>
  );
}
