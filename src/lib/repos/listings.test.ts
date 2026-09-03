import { describe, expect, it } from "vitest";

import { toListing } from "./listings";

describe("listing mapping", () => {
  it("maps owner identity and status from stored rows", () => {
    const now = new Date("2026-06-09T08:30:00.000Z");
    expect(
      toListing(
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Harare Central Pharmacy",
          kind: "Pharmacy",
          mode: "Sale",
          location: "Harare CBD",
          price: "85000.00",
          currency: "USD",
          beds: null,
          rooms: 3,
          staff: 4,
          posted: now,
          cover: "from-sky-500 to-slate-800",
          description: "Retail pharmacy.",
          confidential: true,
          ownerId: "33333333-3333-4333-8333-333333333333",
          status: "Open",
          createdAt: now,
          updatedAt: now,
        },
        "Chipo Ncube",
      ),
    ).toMatchObject({
      title: "Harare Central Pharmacy",
      price: 85000,
      ownerId: "33333333-3333-4333-8333-333333333333",
      ownerName: "Chipo Ncube",
      status: "Open",
      confidential: true,
    });
  });
});
