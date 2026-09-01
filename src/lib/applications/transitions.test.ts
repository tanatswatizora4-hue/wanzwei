import { describe, expect, it } from "vitest";

import {
  canTransitionApplicationStatus,
  nextApplicationStatuses,
} from "./transitions";

describe("application status transitions", () => {
  it("allows same-status as a no-op", () => {
    expect(canTransitionApplicationStatus("Hired", "Hired")).toBe(true);
  });

  it("blocks jumps from Under Review to Hired", () => {
    expect(canTransitionApplicationStatus("Under Review", "Hired")).toBe(false);
  });

  it("allows Under Review to Screening, Shortlisted, or Rejected", () => {
    expect(canTransitionApplicationStatus("Under Review", "Screening")).toBe(true);
    expect(canTransitionApplicationStatus("Under Review", "Shortlisted")).toBe(true);
    expect(canTransitionApplicationStatus("Under Review", "Rejected")).toBe(true);
  });

  it("treats Hired and Rejected as terminal", () => {
    expect(canTransitionApplicationStatus("Hired", "Rejected")).toBe(false);
    expect(canTransitionApplicationStatus("Rejected", "Under Review")).toBe(false);
    expect(nextApplicationStatuses("Hired")).toEqual(["Hired"]);
    expect(nextApplicationStatuses("Rejected")).toEqual(["Rejected"]);
  });
});
