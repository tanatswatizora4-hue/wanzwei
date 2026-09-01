import { describe, expect, it } from "vitest";

import type { Facility, Job } from "@/lib/types";

import {
  canViewProfessionalJobDetail,
  parseProfessionalJobId,
  presentProfessionalJobDetail,
  professionalJobHref,
} from "./professional-job-detail";

const JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: JOB_ID,
    title: "Registered Nurse",
    facilityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    location: "Harare",
    type: "Locum",
    postedAt: "2026-08-01T00:00:00.000Z",
    status: "Open",
    applicants: 3,
    description: "Ward cover",
    tags: ["Nursing"],
    saved: false,
    applied: false,
    ...overrides,
  };
}

const facility: Facility = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Cure Hospital",
  type: "Hospital",
  location: "Harare",
  verified: false,
  rating: 0,
  openRoles: 2,
  logoColor: "from-slate-400 to-slate-600",
  initials: "CH",
};

describe("professional job detail", () => {
  it("accepts a real job uuid and builds a real href", () => {
    expect(parseProfessionalJobId(JOB_ID)).toBe(JOB_ID);
    expect(professionalJobHref(JOB_ID)).toBe(`/professional/jobs/${JOB_ID}`);
    expect(professionalJobHref(JOB_ID)).not.toBe("#");
  });

  it("rejects an invalid job id", () => {
    expect(parseProfessionalJobId("not-a-uuid")).toBeNull();
    expect(parseProfessionalJobId("../etc/passwd")).toBeNull();
  });

  it("only professionals may view the professional job detail page", () => {
    expect(canViewProfessionalJobDetail({ role: "professional" })).toBe(true);
    expect(canViewProfessionalJobDetail({ role: "facility" })).toBe(false);
    expect(canViewProfessionalJobDetail({ role: "admin" })).toBe(false);
    expect(canViewProfessionalJobDetail(null)).toBe(false);
  });

  it("treats a missing job as not found", () => {
    expect(presentProfessionalJobDetail(null)).toEqual({ status: "not_found" });
  });

  it("exposes open vs closed without hiding a closed job", () => {
    expect(presentProfessionalJobDetail({ job: job(), facility })).toMatchObject({
      status: "ok",
      isOpen: true,
    });
    expect(
      presentProfessionalJobDetail({
        job: job({ status: "Closed" }),
        facility,
      }),
    ).toMatchObject({
      status: "ok",
      isOpen: false,
    });
  });
});
