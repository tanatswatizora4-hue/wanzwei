import { describe, expect, it } from "vitest";

import {
  applyBroadcastTypeConstraints,
  emptyTargetingCriteria,
  formatTargetingSummaryLines,
} from "./criteria";

describe("broadcast targeting constraints", () => {
  it("forces verifiedOnly for emergency broadcasts", () => {
    const criteria = applyBroadcastTypeConstraints("emergency", {
      ...emptyTargetingCriteria(),
      verifiedOnly: false,
      professions: ["Nurse"],
    });
    expect(criteria.verifiedOnly).toBe(true);
    expect(criteria.networkOnly).toBe(false);
  });

  it("forces networkOnly for internal locum broadcasts", () => {
    const criteria = applyBroadcastTypeConstraints("internal_locum", {
      ...emptyTargetingCriteria(),
      networkOnly: false,
    });
    expect(criteria.networkOnly).toBe(true);
    expect(criteria.verifiedOnly).toBe(false);
  });

  it("does not silently broaden locum filters", () => {
    const criteria = applyBroadcastTypeConstraints("locum", {
      ...emptyTargetingCriteria(),
      verifiedOnly: true,
      networkOnly: true,
      professions: ["Nurse"],
      locations: ["Harare"],
    });
    expect(criteria).toEqual({
      ...emptyTargetingCriteria(),
      verifiedOnly: true,
      networkOnly: true,
      professions: ["Nurse"],
      locations: ["Harare"],
    });
  });

  it("summarizes inspectable filters", () => {
    const lines = formatTargetingSummaryLines({
      ...emptyTargetingCriteria(),
      verifiedOnly: true,
      professions: ["Nurse"],
      locations: ["Harare"],
      networkOnly: true,
      relationshipTypes: ["approved_locum"],
    });
    expect(lines).toContain("Verified professionals: Yes");
    expect(lines).toContain("Profession: Nurse");
    expect(lines).toContain("Location: Harare");
    expect(lines).toContain("Network: Approved locum");
  });
});
