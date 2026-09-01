import { describe, expect, it } from "vitest";

import { likeContainsPattern, parseJobSearchParams } from "./search";

describe("job search params", () => {
  it("parses keyword, location, and employment type from URL query", () => {
    expect(
      parseJobSearchParams({
        q: " nurse ",
        location: "Harare",
        type: "Locum",
      }),
    ).toEqual({ q: "nurse", location: "Harare", type: "Locum" });
  });

  it("ignores unknown types instead of pretending they filter", () => {
    expect(parseJobSearchParams({ type: "internship" }).type).toBeUndefined();
  });

  it("strips LIKE wildcards from user input", () => {
    expect(likeContainsPattern("%_abc\\")).toBe("%abc%");
  });
});
