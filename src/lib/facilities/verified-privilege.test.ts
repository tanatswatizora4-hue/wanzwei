import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("facility verified cannot be self-promoted", () => {
  it("settings and facility profile patches never write verified", () => {
    const patch = {
      name: "Cure Hospital",
      type: "Hospital" as const,
      location: "Harare",
    };
    expect(Object.keys(patch).sort()).toEqual(["location", "name", "type"]);
    expect("verified" in patch).toBe(false);
  });

  it("updateFacilityPublicProfile does not set verified", () => {
    const source = readFileSync("src/lib/repos/facilities.ts", "utf8");
    const start = source.indexOf(
      "export async function updateFacilityPublicProfile",
    );
    const end = source.indexOf("export async function provisionFacilityUser");
    const fn = source.slice(start, end);
    expect(fn).not.toMatch(/verified/);
  });

  it("signup provisioning always inserts facilities.verified false", () => {
    const source = readFileSync("src/lib/repos/facilities.ts", "utf8");
    const start = source.indexOf("export async function provisionFacilityUser");
    const fn = source.slice(start);
    expect(fn).toMatch(/verified:\s*false/);
    expect(fn).not.toMatch(/verified:\s*true/);
  });
});
