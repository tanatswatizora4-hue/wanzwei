import type { Role } from "@/lib/types";

export function canManageListing(input: {
  actor: { role: Role; id: string } | null;
  listingOwnerId: string | null | undefined;
}): boolean {
  if (!input.actor) return false;
  if (input.actor.role === "admin") return true;
  if (input.actor.role !== "facility") return false;
  if (!input.listingOwnerId) return false;
  return input.actor.id === input.listingOwnerId;
}

export function canCreateListing(input: {
  actor: { role: Role } | null;
}): boolean {
  if (!input.actor) return false;
  return input.actor.role === "admin" || input.actor.role === "facility";
}

export function canSendListingEnquiry(input: {
  actor: { role: Role; id: string } | null;
  listingOwnerId: string | null | undefined;
}): boolean {
  if (!input.actor) return false;
  if (input.listingOwnerId && input.actor.id === input.listingOwnerId) {
    return false;
  }
  return true;
}

export function canViewListingEnquiry(input: {
  actor: { role: Role; id: string } | null;
  fromUserId: string;
  listingOwnerId: string | null | undefined;
}): boolean {
  if (!input.actor) return false;
  if (input.actor.role === "admin") return true;
  if (input.actor.id === input.fromUserId) return true;
  if (input.listingOwnerId && input.actor.id === input.listingOwnerId) {
    return true;
  }
  return false;
}
