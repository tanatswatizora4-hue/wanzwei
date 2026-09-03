import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("marketplace actions", () => {
  const source = readFileSync("src/app/(app)/marketplace/actions.ts", "utf8");

  it("creates listings only for facility or admin and stamps the signed-in owner", () => {
    const create = source.slice(
      source.indexOf("export async function createListingAction"),
      source.indexOf("export async function updateListingAction"),
    );
    expect(create).toContain('requireRole(["facility", "admin"])');
    expect(create).toContain("canCreateListing");
    expect(create).toContain("ownerId: user.id");
  });

  it("blocks unauthorized listing edits", () => {
    const update = source.slice(
      source.indexOf("export async function updateListingAction"),
      source.indexOf("export async function sendListingEnquiryAction"),
    );
    expect(update).toContain("canManageListing");
    expect(update).toContain("You cannot edit this listing.");
    expect(update).toContain("user.role === \"admin\"");
  });

  it("persists enquiries instead of toasting a fake send", () => {
    const enquiry = source.slice(
      source.indexOf("export async function sendListingEnquiryAction"),
    );
    expect(enquiry).toContain("createListingEnquiry");
    expect(enquiry).toContain("canSendListingEnquiry");
    expect(enquiry).toContain("userAlreadyEnquired");
  });
});

describe("marketplace pages", () => {
  it("browse, search, and detail are restored for all roles", () => {
    for (const file of [
      "src/app/(app)/professional/marketplace/page.tsx",
      "src/app/(app)/facility/marketplace/page.tsx",
      "src/app/(app)/admin/marketplace/page.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("listListings");
      expect(source, file).toContain("parseMarketplaceSearchParams");
      expect(source, file).not.toContain("mvpSurfaceUnavailable");
    }
    const detail = readFileSync(
      "src/app/(app)/professional/marketplace/[id]/page.tsx",
      "utf8",
    );
    expect(detail).toContain("getListingById");
    expect(detail).toContain("MarketplaceDetailView");
  });

  it("does not invent checkout, ratings, or toast-only enquiries", () => {
    const view = readFileSync("src/components/app/marketplace-view.tsx", "utf8");
    expect(view).toContain("Enquiry-based");
    expect(view).not.toContain("toast.success");
    expect(view).not.toContain("rating");
    expect(view).toContain("MarketplaceEnquiryDialog");
    expect(view).toContain("MarketplaceSearchStrip");
  });
});
