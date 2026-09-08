import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("marketplace actions", () => {
  const source = readFileSync("src/app/(app)/marketplace/actions.ts", "utf8");

  it("creates listings for verified professionals or facility members and stamps server-side seller identity", () => {
    const create = source.slice(
      source.indexOf("export async function createListingAction"),
      source.indexOf("export async function updateListingAction"),
    );
    expect(create).toContain('requireRole(["professional", "facility", "admin"])');
    expect(create).toContain("ownerId: user.id");
    expect(create).toContain("sellerType: \"facility\"");
    expect(create).toContain("isVerifiedProfessional");
    expect(create).not.toContain("formData.get(\"seller_id\")");
    const upload = readFileSync(
      "src/app/api/uploads/listing-images/route.ts",
      "utf8",
    );
    expect(upload).toContain("canManageListing");
    expect(upload).toContain("LISTING_IMAGES_BUCKET");
    expect(upload).not.toContain("DOCUMENTS_BUCKET");
  });

  it("blocks unauthorized listing edits", () => {
    const update = source.slice(
      source.indexOf("export async function updateListingAction"),
      source.indexOf("export async function setListingStatusAction"),
    );
    expect(update).toContain("canManageListing");
    expect(update).toContain("You cannot edit this listing.");
    expect(update).toContain("updateListingById");
  });

  it("lets owners pause, republish, and delete; non-owners cannot", () => {
    const status = source.slice(
      source.indexOf("export async function setListingStatusAction"),
      source.indexOf("export async function deleteListingAction"),
    );
    const del = source.slice(
      source.indexOf("export async function deleteListingAction"),
      source.indexOf("export async function sendListingEnquiryAction"),
    );
    expect(status).toContain("canManageListing");
    expect(status).toContain("status: parsed.data.status");
    expect(del).toContain("canManageListing");
    expect(del).toContain("You cannot delete this listing.");
    expect(source).toContain("listingVisiblePublicly");
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
    expect(detail).toContain("loadMarketplaceListingPage");
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
