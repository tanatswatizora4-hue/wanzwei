import { describe, expect, it } from "vitest";

import { parseCpdSearchParams, likeContainsPattern } from "./search";

describe("CPD search", () => {
  it("parses catalogue filters and ignores unknown values", () => {
    expect(
      parseCpdSearchParams({
        q: "  BLS  ",
        category: "Clinical",
        format: "Online",
        tab: "registered",
      }),
    ).toEqual({
      q: "BLS",
      category: "Clinical",
      format: "Online",
      tab: "registered",
    });

    expect(
      parseCpdSearchParams({
        category: "Fake",
        format: "Zoom",
        tab: "all",
      }),
    ).toEqual({
      q: undefined,
      category: undefined,
      format: undefined,
      tab: "catalogue",
    });
  });

  it("strips LIKE wildcards from user search", () => {
    expect(likeContainsPattern("%admin_")).toBe("%admin%");
  });
});
