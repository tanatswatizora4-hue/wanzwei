import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { professionalJobPath } from "@/lib/jobs/paths";

describe("job links use real ids", () => {
  it("JobRow no longer defaults to a dead hash link", () => {
    const source = readFileSync("src/components/app/job-row.tsx", "utf8");
    expect(source).not.toContain('href ?? "#"');
    expect(source).toContain("href: string");
  });

  it("professional dashboard and saved jobs pass professionalJobPath", () => {
    const dashboard = readFileSync(
      "src/app/(app)/professional/dashboard/page.tsx",
      "utf8",
    );
    const saved = readFileSync(
      "src/app/(app)/professional/saved/page.tsx",
      "utf8",
    );
    const browse = readFileSync(
      "src/app/(app)/professional/jobs/page.tsx",
      "utf8",
    );

    expect(dashboard).toContain("professionalJobPath(job.id)");
    expect(saved).toContain("professionalJobPath(job.id)");
    expect(browse).toContain("professionalJobPath(job.id)");
    expect(professionalJobPath("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")).toBe(
      "/professional/jobs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
  });
});
