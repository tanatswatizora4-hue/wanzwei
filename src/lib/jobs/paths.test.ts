import { describe, expect, it } from "vitest";

import { professionalJobPath, professionalApplicationPath, facilityJobPath, facilityApplicationPath, adminVerificationPath } from "./paths";

describe("professionalJobPath", () => {
  it("builds a real job detail href from the job id", () => {
    const jobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect(professionalJobPath(jobId)).toBe(
      `/professional/jobs/${jobId}`,
    );
    expect(professionalJobPath(jobId)).not.toBe("#");
  });

  it("builds professional application and facility inspect hrefs", () => {
    const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    expect(professionalApplicationPath(id)).toBe(
      `/professional/applications/${id}`,
    );
    expect(facilityJobPath(id)).toBe(`/facility/jobs/${id}`);
    expect(facilityApplicationPath(id)).toBe(`/facility/applications/${id}`);
    expect(adminVerificationPath(id)).toBe(`/admin/verification/${id}`);
  });
});
