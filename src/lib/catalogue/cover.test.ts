import { describe, expect, it } from "vitest";

import { catalogueCoverClass } from "./cover";

describe("catalogueCoverClass", () => {
  it("keeps gradient utility classes", () => {
    expect(catalogueCoverClass("from-violet-500 to-slate-800")).toBe(
      "from-violet-500 to-slate-800",
    );
  });

  it("does not use missing file paths as covers", () => {
    expect(catalogueCoverClass("/covers/bls.jpg", "from-rose-500 to-rose-900")).toBe(
      "from-rose-500 to-rose-900",
    );
    expect(catalogueCoverClass("https://example.com/a.jpg")).toBe(
      "from-slate-500 to-slate-800",
    );
  });
});
