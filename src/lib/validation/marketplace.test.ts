import { describe, expect, it } from "vitest";

import {
  CreateListingEnquirySchema,
  CreateListingSchema,
} from "./marketplace";

describe("marketplace validation", () => {
  it("accepts an enquiry-based listing payload", () => {
    const parsed = CreateListingSchema.parse({
      title: "Borrowdale clinic",
      kind: "Clinic",
      mode: "Sale",
      location: "Harare",
      price: "120000",
      description: "Consulting rooms with existing staff.",
    });
    expect(parsed.price).toBe(120000);
    expect(parsed.currency).toBe("USD");
    expect(parsed.status).toBe("Open");
    expect(parsed.confidential).toBe(false);
  });

  it("requires a real enquiry message", () => {
    const listingId = "11111111-1111-4111-8111-111111111111";
    expect(
      CreateListingEnquirySchema.parse({
        listingId,
        name: "Dr Moyo",
        email: "moyo@example.com",
        message: "May I book a viewing?",
      }).phone,
    ).toBe("");
    expect(
      CreateListingEnquirySchema.safeParse({
        listingId,
        name: "Dr Moyo",
        email: "bad",
        message: "Hello",
      }).success,
    ).toBe(false);
  });
});
