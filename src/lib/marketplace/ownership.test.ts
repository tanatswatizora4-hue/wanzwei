import { describe, expect, it } from "vitest";

import {
  canCreateListing,
  canManageListing,
  canSendListingEnquiry,
  canViewListingEnquiry,
} from "./ownership";

describe("marketplace ownership", () => {
  it("blocks unauthorized listing edits", () => {
    expect(
      canManageListing({
        actor: { role: "facility", id: "owner-1" },
        listingOwnerId: "owner-1",
      }),
    ).toBe(true);
    expect(
      canManageListing({
        actor: { role: "facility", id: "owner-1" },
        listingOwnerId: "owner-2",
      }),
    ).toBe(false);
    expect(
      canManageListing({
        actor: { role: "professional", id: "pro-1" },
        listingOwnerId: "pro-1",
      }),
    ).toBe(false);
    expect(
      canManageListing({
        actor: { role: "facility", id: "owner-1" },
        listingOwnerId: null,
      }),
    ).toBe(false);
    expect(
      canManageListing({
        actor: { role: "admin", id: "admin-1" },
        listingOwnerId: "owner-2",
      }),
    ).toBe(true);
  });

  it("restricts create and enquiry parties", () => {
    expect(canCreateListing({ actor: { role: "facility" } })).toBe(true);
    expect(canCreateListing({ actor: { role: "professional" } })).toBe(false);
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
    expect(
      canViewListingEnquiry({
        actor: { role: "professional", id: "pro-2" },
        fromUserId: "pro-1",
        listingOwnerId: "owner-1",
      }),
    ).toBe(false);
  });
});
