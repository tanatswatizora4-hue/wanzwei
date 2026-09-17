import { describe, expect, it } from "vitest";

import {
  facilityCapabilities,
  hasFacilityCapability,
} from "./facility-capabilities";

describe("facility membership capabilities", () => {
  it("gives owners and admins full workspace control except employment claims", () => {
    for (const role of ["owner", "admin"] as const) {
      const caps = facilityCapabilities(role);
      expect(caps.manageMembers).toBe(true);
      expect(caps.manageJobs).toBe(true);
      expect(caps.manageApplicants).toBe(true);
      expect(caps.manageEmergency).toBe(true);
      expect(caps.manageMarketplace).toBe(true);
      expect(caps.manageFacilitySettings).toBe(true);
      expect(caps.manageVerification).toBe(true);
    }
  });

  it("lets recruiters run hiring but not members, verification, or listings", () => {
    expect(hasFacilityCapability("recruiter", "manageJobs")).toBe(true);
    expect(hasFacilityCapability("recruiter", "manageApplicants")).toBe(true);
    expect(hasFacilityCapability("recruiter", "manageEmergency")).toBe(false);
    expect(hasFacilityCapability("recruiter", "manageMarketplace")).toBe(false);
    expect(hasFacilityCapability("recruiter", "manageMembers")).toBe(false);
    expect(hasFacilityCapability("recruiter", "manageVerification")).toBe(false);
    expect(hasFacilityCapability("recruiter", "viewProfessionalNetwork")).toBe(true);
    expect(hasFacilityCapability("recruiter", "createRecruitmentBroadcast")).toBe(true);
    expect(hasFacilityCapability("recruiter", "manageProfessionalNetwork")).toBe(false);
  });

  it("keeps viewers read-only", () => {
    expect(hasFacilityCapability("viewer", "viewFacility")).toBe(true);
    expect(hasFacilityCapability("viewer", "manageJobs")).toBe(false);
    expect(hasFacilityCapability("viewer", "manageApplicants")).toBe(false);
    expect(hasFacilityCapability("viewer", "manageMembers")).toBe(false);
    expect(hasFacilityCapability("viewer", "viewProfessionalNetwork")).toBe(true);
    expect(hasFacilityCapability("viewer", "manageProfessionalNetwork")).toBe(false);
    expect(hasFacilityCapability("viewer", "createRecruitmentBroadcast")).toBe(false);
  });

  it("gives owner and admin network management and recruitment broadcasts", () => {
    for (const role of ["owner", "admin"] as const) {
      expect(hasFacilityCapability(role, "viewProfessionalNetwork")).toBe(true);
      expect(hasFacilityCapability(role, "manageProfessionalNetwork")).toBe(true);
      expect(hasFacilityCapability(role, "createRecruitmentBroadcast")).toBe(true);
      expect(hasFacilityCapability(role, "manageEmergency")).toBe(true);
    }
  });
});
