"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendListingEnquiryAction } from "@/app/(app)/marketplace/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";

export function MarketplaceEnquiryDialog({
  listingId,
  listingTitle,
  defaultName,
  defaultEmail,
}: {
  listingId: string;
  listingTitle: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await sendListingEnquiryAction(formData);
      if (result.ok) {
        toast.success("Enquiry sent", {
          description: "The listing owner can read it in Wanzwei. There is no checkout or payment on this marketplace.",
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send enquiry.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Enquire</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confidential enquiry</DialogTitle>
          <DialogDescription>
            Send a message about “{listingTitle}”. This is an enquiry, not a purchase.
            No payment is processed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-3">
          <input type="hidden" name="listingId" value={listingId} />
          <div className="grid gap-1.5">
            <Label htmlFor={`enquiry-name-${listingId}`}>Your name</Label>
            <Input
              id={`enquiry-name-${listingId}`}
              name="name"
              required
              defaultValue={defaultName}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`enquiry-email-${listingId}`}>Email</Label>
            <Input
              id={`enquiry-email-${listingId}`}
              name="email"
              type="email"
              required
              defaultValue={defaultEmail}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`enquiry-phone-${listingId}`}>Phone (optional)</Label>
            <Input id={`enquiry-phone-${listingId}`} name="phone" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`enquiry-message-${listingId}`}>Message</Label>
            <Textarea
              id={`enquiry-message-${listingId}`}
              name="message"
              rows={4}
              required
              placeholder="Ask about operations, timing, or a viewing."
            />
          </div>
          <DialogFooter className="mt-1">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Send enquiry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
