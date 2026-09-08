import { describe, expect, it } from "vitest";

import {
  canCreateListing,
  canManageListing,
  canSendListingEnquiry,
  canViewListingEnquiry,
  listingVisiblePublicly,
} from "./ownership";
import { canViewListingDetail } from "./listing-access";

const FAC_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FAC_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("marketplace ownership", () => {
  it("lets a verified professional create in a professional workspace", () => {
    expect(
      canCreateListing({
        actor: { role: "professional", id: "pro-1", verified: true },
        workspace: { type: "professional", professionalProfileId: "pro-1" },
      }),
    ).toBe(true);
    expect(
      canCreateListing({
        actor: { role: "professional", id: "pro-1", verified: false },
        workspace: { type: "professional", professionalProfileId: "pro-1" },
      }),
    ).toBe(false);
  });

  it("lets a facility member create in a facility workspace", () => {
    expect(
      canCreateListing({
        actor: { role: "facility", id: "fac-user" },
        workspace: {
          type: "facility",
          facilityId: FAC_A,
          membershipRole: "owner",
        },
      }),
    ).toBe(true);
  });

  it("blocks unauthorized listing edits and deletes", () => {
    expect(
      canManageListing({
        actor: { role: "professional", id: "pro-1" },
        listingOwnerId: "pro-1",
        listingSellerType: "professional",
      }),
    ).toBe(true);
    expect(
      canManageListing({
        actor: { role: "professional", id: "pro-2" },
        listingOwnerId: "pro-1",
        listingSellerType: "professional",
      }),
    ).toBe(false);
    expect(
      canManageListing({
        actor: { role: "facility", id: "user-a" },
        listingOwnerId: "user-a",
        listingSellerType: "facility",
        listingFacilityId: FAC_A,
        actorFacilityIds: [FAC_A],
      }),
    ).toBe(true);
    expect(
      canManageListing({
        actor: { role: "facility", id: "user-a" },
        listingOwnerId: "user-a",
        listingSellerType: "facility",
        listingFacilityId: FAC_B,
        actorFacilityIds: [FAC_A],
      }),
    ).toBe(false);
    expect(
      canManageListing({
        actor: { role: "admin", id: "admin-1" },
        listingOwnerId: "owner-2",
      }),
    ).toBe(true);
  });

  it("does not let switching workspace steal listing ownership", () => {
    expect(
      canManageListing({
        actor: { role: "professional", id: "pro-1" },
        listingOwnerId: "pro-1",
        listingSellerType: "facility",
        listingFacilityId: FAC_A,
        actorFacilityIds: [],
      }),
    ).toBe(false);
  });

  it("rejects listing image writes without listing ownership", () => {
    expect(
      canManageListing({
        actor: { role: "professional", id: "pro-2" },
        listingOwnerId: "pro-1",
        listingSellerType: "professional",
      }),
    ).toBe(false);
  });

  it("hides paused listings from the public catalogue", () => {
    expect(listingVisiblePublicly("Open")).toBe(true);
    expect(listingVisiblePublicly("Paused")).toBe(false);
    expect(listingVisiblePublicly("Draft")).toBe(false);
    expect(listingVisiblePublicly("Closed")).toBe(false);
    expect(
      canViewListingDetail({
        actor: { role: "professional", id: "pro-2" },
        status: "Paused",
        listingOwnerId: "pro-1",
        listingSellerType: "professional",
      }),
    ).toBe(false);
    expect(
      canViewListingDetail({
        actor: { role: "professional", id: "pro-1" },
        status: "Paused",
        listingOwnerId: "pro-1",
        listingSellerType: "professional",
      }),
    ).toBe(true);
  });


  it("restricts enquiry parties", () => {
    expect(
      canSendListingEnquiry({
        actor: { role: "professional", id: "pro-1" },
        listingOwnerId: "owner-1",
      }),
    ).toBe(true);
    expect(
      canSendListingEnquiry({
        actor: { role: "facility", id: "owner-1" },
        listingOwnerId: "owner-1",
      }),
    ).toBe(false);
    expect(
      canViewListingEnquiry({
        actor: { role: "professional", id: "pro-1" },
        fromUserId: "pro-1",
        listingOwnerId: "owner-1",
      }),
    ).toBe(true);
  });
});
