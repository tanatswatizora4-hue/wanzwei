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
import type { Listing } from "@/lib/types";

const KINDS = ["Clinic", "Pharmacy", "Hospital", "Laboratory", "Practice"] as const;
const MODES = ["Sale", "Lease"] as const;

export function MarketplaceListingDialog({
  listing,
  triggerLabel = "List your practice",
}: {
  listing?: Listing;
  triggerLabel?: string;
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
        toast.success(isEdit ? "Listing updated" : "Listing published");
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
          {isEdit ? "Edit listing" : (
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
          <div>
            <Label htmlFor="listing-title">Title</Label>
            <Input
              id="listing-title"
              name="title"
              required
              defaultValue={listing?.title}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="listing-kind">Type</Label>
              <select
                id="listing-kind"
                name="kind"
                defaultValue={listing?.kind ?? "Clinic"}
                className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="listing-mode">Mode</Label>
              <select
                id="listing-mode"
                name="mode"
                defaultValue={listing?.mode ?? "Sale"}
                className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
              >
                {MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
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
              <Label htmlFor="listing-price">Asking price</Label>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="listing-beds">Beds</Label>
              <Input
                id="listing-beds"
                name="beds"
                type="number"
                min="0"
                defaultValue={listing?.beds}
              />
            </div>
            <div>
              <Label htmlFor="listing-rooms">Rooms</Label>
              <Input
                id="listing-rooms"
                name="rooms"
                type="number"
                min="0"
                defaultValue={listing?.rooms}
              />
            </div>
            <div>
              <Label htmlFor="listing-staff">Staff</Label>
              <Input
                id="listing-staff"
                name="staff"
                type="number"
                min="0"
                defaultValue={listing?.staff}
              />
            </div>
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
          <div>
            <Label htmlFor="listing-status">Availability</Label>
            <select
              id="listing-status"
              name="status"
              defaultValue={listing?.status ?? "Open"}
              className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
            >
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              name="confidential"
              defaultChecked={listing?.confidential === true}
            />
            Keep this enquiry confidential
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isEdit ? "Save listing" : "Publish listing"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
