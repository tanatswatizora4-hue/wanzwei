import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isVerifiedProfessional } from "@/lib/auth/professional-verification";

describe("apply remains verified-gated", () => {
  it("keeps applyForJobAction behind requireVerifiedProfessional", () => {
    const source = readFileSync(
      "src/app/(app)/professional/jobs/actions.ts",
      "utf8",
    );
    const start = source.indexOf("export async function applyForJobAction");
    const end = source.indexOf("export async function toggleSaveJobAction");
    const apply = source.slice(start, end);

    expect(apply).toContain("requireVerifiedProfessional");
    expect(apply.indexOf("requireVerifiedProfessional")).toBeLessThan(
      apply.indexOf("applyForJob("),
    );
  });

  it("does not treat unverified professionals as allowed to apply", () => {
    expect(
      isVerifiedProfessional({ role: "professional", verified: false }),
    ).toBe(false);
    expect(
      isVerifiedProfessional({ role: "professional", verified: true }),
    ).toBe(true);
  });
});
