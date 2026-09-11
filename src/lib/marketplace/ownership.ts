import type { Role } from "@/lib/types";

import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import type { ActiveWorkspace } from "@/lib/auth/workspace-model";

export type ListingSellerType = "professional" | "facility";

export type ListingActor = {
  role: Role;
  id: string;
  verified?: boolean;
};

export function canCreateListing(input: {
  actor: ListingActor | null;
  workspace: ActiveWorkspace | { type: "admin" } | null;
}): boolean {
  if (!input.actor || !input.workspace) return false;
  if (input.actor.role === "admin") return true;
  if (input.workspace.type === "professional") {
    return input.actor.verified === true;
  }
  if (input.workspace.type === "facility") {
    return hasFacilityCapability(
      input.workspace.membershipRole,
      "manageMarketplace",
    );
  }
  return false;
}

export function sellerFromWorkspace(input: {
  actorId: string;
  workspace: ActiveWorkspace | { type: "admin" } | null;
}): {
  sellerType: ListingSellerType | null;
  facilityId: string | null;
  ownerId: string;
} | null {
  if (!input.workspace) return null;
  if (input.workspace.type === "professional") {
    return {
      sellerType: "professional",
      facilityId: null,
      ownerId: input.actorId,
    };
  }
  if (input.workspace.type === "facility") {
    return {
      sellerType: "facility",
      facilityId: input.workspace.facilityId,
      ownerId: input.actorId,
    };
  }
  return {
    sellerType: null,
    facilityId: null,
    ownerId: input.actorId,
  };
}

export function canManageListing(input: {
  actor: ListingActor | null;
  listingOwnerId: string | null | undefined;
  listingSellerType?: ListingSellerType | null;
  listingFacilityId?: string | null;
  actorFacilityIds?: string[];
  activeWorkspaceType?: "professional" | "facility" | "admin";
}): boolean {
  if (!input.actor) return false;
  if (input.actor.role === "admin") return true;
  if (
    input.activeWorkspaceType === "professional" &&
    input.listingSellerType === "facility"
  ) {
    return false;
  }
  if (
    input.activeWorkspaceType === "facility" &&
    input.listingSellerType === "professional"
  ) {
    return false;
  }
  if (
    input.listingSellerType === "facility" &&
    input.listingFacilityId &&
    input.actorFacilityIds?.includes(input.listingFacilityId)
  ) {
    return true;
  }
  if (!input.listingOwnerId) return false;
  if (input.listingSellerType === "professional") {
    return input.actor.id === input.listingOwnerId;
  }
  if (input.listingSellerType === "facility") {
    return false;
  }
  // Legacy listings without seller_type: owner_id only.
  if (input.activeWorkspaceType === "facility") return false;
  return input.actor.id === input.listingOwnerId;
}

export function canSendListingEnquiry(input: {
  actor: { role: Role; id: string } | null;
  listingOwnerId: string | null | undefined;
  listingFacilityId?: string | null;
  actorFacilityIds?: string[];
}): boolean {
  if (!input.actor) return false;
  if (input.listingOwnerId && input.actor.id === input.listingOwnerId) {
    return false;
  }
  if (
    input.listingFacilityId &&
    input.actorFacilityIds?.includes(input.listingFacilityId)
  ) {
    return false;
  }
  return true;
}

export function canViewListingEnquiry(input: {
  actor: { role: Role; id: string } | null;
  fromUserId: string;
  listingOwnerId: string | null | undefined;
  listingFacilityId?: string | null;
  actorFacilityIds?: string[];
}): boolean {
  if (!input.actor) return false;
  if (input.actor.role === "admin") return true;
  if (input.actor.id === input.fromUserId) return true;
  if (input.listingOwnerId && input.actor.id === input.listingOwnerId) {
    return true;
  }
  if (
    input.listingFacilityId &&
    input.actorFacilityIds?.includes(input.listingFacilityId)
  ) {
    return true;
  }
  return false;
}

export function listingVisiblePublicly(status: string | null | undefined): boolean {
  return status === "Open";
}

export function canChangeListingOwnerFields(): boolean {
  return false;
}
