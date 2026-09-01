import { describe, expect, it } from "vitest";

import { professionalJobPath } from "./paths";

describe("professionalJobPath", () => {
  it("builds a real job detail href from the job id", () => {
    const jobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect(professionalJobPath(jobId)).toBe(
      `/professional/jobs/${jobId}`,
    );
    expect(professionalJobPath(jobId)).not.toBe("#");
  });
});
