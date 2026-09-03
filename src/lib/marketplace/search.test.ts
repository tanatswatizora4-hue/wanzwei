import { describe, expect, it } from "vitest";

import {
  parseMarketplaceSearchParams,
  priceBounds,
  likeContainsPattern,
} from "./search";

describe("marketplace search", () => {
  it("parses kind, mode, and asking-price buckets", () => {
    expect(
      parseMarketplaceSearchParams({
        q: " Harare ",
        kind: "Clinic",
        mode: "Lease",
        price: "100k-500k",
        mine: "1",
      }),
    ).toEqual({
      q: "Harare",
      kind: "Clinic",
      mode: "Lease",
      price: "100k-500k",
      mine: true,
    });
    expect(parseMarketplaceSearchParams({ kind: "Spa", mode: "Rent" })).toEqual({
      q: undefined,
      kind: undefined,
      mode: undefined,
      price: undefined,
      mine: undefined,
    });
  });

  it("maps price filters to numeric bounds", () => {
    expect(priceBounds("lt-100k")).toEqual({ max: 99_999.99 });
    expect(priceBounds("500k-plus")).toEqual({ min: 500_000.01 });
  });

  it("strips LIKE wildcards", () => {
    expect(likeContainsPattern("%_")).toBe("%%");
  });
});
