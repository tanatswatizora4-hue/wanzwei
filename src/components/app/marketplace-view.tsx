"use client";

import * as React from "react";
import {
  Bed,
  Building2,
  DoorOpen,
  Eye,
  Filter,
  Lock,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { toast } from "sonner";

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

export function MarketplaceView({ listings }: { listings: Listing[] }) {
  const [active, setActive] = React.useState<Listing | null>(null);
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Healthcare Marketplace"
        description="Confidential listings for buying, selling and leasing healthcare practices."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" /> Filters
            </Button>
            <Button size="sm">List your practice</Button>
          </>
        }
      />

      <Card>
        <CardBody className="pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
              <Input placeholder="Search by name or location" className="pl-9" />
            </div>
            <Select defaultValue="all-kinds">
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-kinds">All types</SelectItem>
                <SelectItem value="clinic">Clinic</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="hospital">Hospital</SelectItem>
                <SelectItem value="laboratory">Laboratory</SelectItem>
                <SelectItem value="practice">Practice</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-modes">
              <SelectTrigger>
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-modes">Sale or Lease</SelectItem>
                <SelectItem value="sale">For sale</SelectItem>
                <SelectItem value="lease">For lease</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="any-price">
              <SelectTrigger>
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any-price">Any price</SelectItem>
                <SelectItem value="lt-100k">Under $100k</SelectItem>
                <SelectItem value="100k-500k">$100k – $500k</SelectItem>
                <SelectItem value="500k-plus">$500k+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Card key={l.id} className="card-hover overflow-hidden flex flex-col">
              <div
                className={`relative h-32 bg-gradient-to-br ${l.cover}`}
                aria-hidden
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="absolute right-3 top-3 flex gap-1.5">
                  {l.confidential ? (
                    <Badge tone="slate" className="bg-black/30 text-white">
                      <Lock className="h-3 w-3" /> Confidential
                    </Badge>
                  ) : null}
                  <Badge
                    tone={l.mode === "Sale" ? "amber" : "sky"}
                    className="bg-white/95 backdrop-blur"
                  >
                    For {l.mode}
                  </Badge>
                </div>
                <div className="absolute left-3 bottom-3">
                  <Badge tone={KIND_TONE[l.kind] ?? "slate"}>
                    <Building2 className="h-3 w-3" /> {l.kind}
                  </Badge>
                </div>
              </div>
              <CardBody className="flex flex-1 flex-col gap-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[14.5px] font-semibold tracking-tight leading-tight">
                    {l.title}
                  </h3>
                </div>
                <p className="text-[12.5px] text-[color:var(--color-ink-500)] inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {l.location}
                </p>
                <p className="line-clamp-2 text-[12.5px] text-[color:var(--color-ink-500)]">
                  {l.description}
                </p>

                <div className="mt-1 flex flex-wrap gap-3 text-[11.5px] text-[color:var(--color-ink-500)]">
                  {l.beds ? (
                    <span className="inline-flex items-center gap-1">
                      <Bed className="h-3 w-3" /> {l.beds} beds
                    </span>
                  ) : null}
                  {l.rooms ? (
                    <span className="inline-flex items-center gap-1">
                      <DoorOpen className="h-3 w-3" /> {l.rooms} rooms
                    </span>
                  ) : null}
                  {l.staff ? (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {l.staff} staff
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-[color:var(--color-ink-400)]">
                      {l.mode === "Sale" ? "Asking price" : "Monthly lease"}
                    </p>
                    <p className="text-[18px] font-semibold tracking-tight">
                      {money(l.price, l.currency)}
                      {l.mode === "Lease" ? (
                        <span className="text-[11px] text-[color:var(--color-ink-400)] font-normal">
                          {" "}
                          / mo
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setActive(l);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" /> Enquire
                    </Button>
                  </DialogTrigger>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confidential enquiry</DialogTitle>
            <DialogDescription>
              {active
                ? `Send an enquiry about "${active.title}". Your details remain confidential until you choose to share.`
                : "Send a confidential enquiry to the seller."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Enquiry sent", {
                description: "We'll forward your message to the seller within 24h.",
              });
              setOpen(false);
            }}
            className="flex flex-col gap-3"
          >
            <div className="grid gap-1.5">
              <Label>Your name</Label>
              <Input required placeholder="Dr. Tinashe Moyo" />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input required type="email" placeholder="you@hospital.co.zw" />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone (optional)</Label>
              <Input placeholder="+263 77 000 0000" />
            </div>
            <div className="grid gap-1.5">
              <Label>Message</Label>
              <Textarea
                placeholder="I'd like to learn more about the financials and operations…"
                rows={4}
                required
              />
            </div>
            <DialogFooter className="mt-1">
              <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send enquiry</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
