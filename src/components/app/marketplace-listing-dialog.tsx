"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createListingAction,
  updateListingAction,
} from "@/app/(app)/marketplace/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  LISTING_CATEGORIES,
  LISTING_CATEGORY_LABELS,
  LISTING_CONDITION_LABELS,
  LISTING_CONDITIONS,
} from "@/lib/marketplace/taxonomy";
import type { Listing } from "@/lib/types";

export function MarketplaceListingDialog({
  listing,
  triggerLabel = "Create Listing",
  listingContext = "professional",
}: {
  listing?: Listing;
  triggerLabel?: string;
  listingContext?: "professional" | "facility" | "admin";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const isEdit = Boolean(listing);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = isEdit
        ? await updateListingAction(formData)
        : await createListingAction(formData);
      if (result.ok) {
        toast.success(isEdit ? "Listing updated" : "Listing saved");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save listing.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isEdit ? "secondary" : "primary"}>
          {isEdit ? (
            "Edit listing"
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> {triggerLabel}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit listing" : "Create a listing"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-3">
          {listing ? <input type="hidden" name="id" value={listing.id} /> : null}
          <input type="hidden" name="listingContext" value={listingContext} />
          <input type="hidden" name="kind" value={listing?.kind ?? "Practice"} />
          <input type="hidden" name="mode" value={listing?.mode ?? "Sale"} />
          <div>
            <Label htmlFor="listing-title">Title</Label>
            <Input
              id="listing-title"
              name="title"
              required
              defaultValue={listing?.title}
            />
          </div>
          <div>
            <Label htmlFor="listing-description">Description</Label>
            <Textarea
              id="listing-description"
              name="description"
              rows={4}
              required
              defaultValue={listing?.description}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="listing-category">Category</Label>
              <select
                id="listing-category"
                name="category"
                required
                defaultValue={listing?.category ?? "medical_equipment"}
                className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
              >
                {LISTING_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {LISTING_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="listing-condition">Condition</Label>
              <select
                id="listing-condition"
                name="condition"
                required
                defaultValue={listing?.condition ?? "good"}
                className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
              >
                {LISTING_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {LISTING_CONDITION_LABELS[condition]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="listing-location">Location</Label>
            <Input
              id="listing-location"
              name="location"
              required
              defaultValue={listing?.location}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="listing-price">Price</Label>
              <Input
                id="listing-price"
                name="price"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={listing?.price}
              />
            </div>
            <div>
              <Label htmlFor="listing-currency">Currency</Label>
              <Input
                id="listing-currency"
                name="currency"
                defaultValue={listing?.currency ?? "USD"}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="listing-status">Status</Label>
            <select
              id="listing-status"
              name="status"
              defaultValue={listing?.status ?? "Open"}
              className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
            >
              <option value="Open">Active</option>
              <option value="Paused">Paused</option>
              <option value="Closed">Sold / Closed</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isEdit ? "Save listing" : "Save listing"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
