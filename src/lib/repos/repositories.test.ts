import { afterEach, describe, expect, it } from "vitest";

import {
  createApplication,
  getApplicationsForProfessional,
  toApplication,
} from "./applications";
import { toFacility, listTopHiringFacilities } from "./facilities";
import { getEmergencyAlertsForProfessional, matchProfessionals } from "./emergency-alerts";
import { createJob, listOpenJobsWithFacility, toJob } from "./jobs";
import { toUser, findUserByEmail } from "./users";

describe("repository mapping helpers", () => {
  it("maps database jobs to legacy UI jobs", () => {
    const postedAt = new Date("2026-06-09T08:30:00.000Z");

    expect(
      toJob({
        id: "job-1",
        facilityId: "facility-1",
        title: "Registered Nurse",
        location: "Harare",
        type: "Locum",
        salary: null,
        status: "Open",
        applicantsCount: 3,
        description: "Night shift cover",
        tags: ["ICU"],
        postedAt,
        createdAt: postedAt,
      }),
    ).toEqual({
      id: "job-1",
      facilityId: "facility-1",
      title: "Registered Nurse",
      location: "Harare",
      type: "Locum",
      salary: undefined,
      status: "Open",
      applicants: 3,
      description: "Night shift cover",
      tags: ["ICU"],
      postedAt: "2026-06-09T08:30:00.000Z",
      saved: false,
    });
  });

  it("maps database applications, facilities, and users", () => {
    const now = new Date("2026-06-09T08:30:00.000Z");

    expect(
      toApplication({
        id: "app-1",
        jobId: "job-1",
        professionalId: "pro-1",
        status: "Under Review",
        notes: null,
        appliedAt: now,
        updatedAt: now,
      }),
    ).toEqual({
      id: "app-1",
      jobId: "job-1",
      professionalId: "pro-1",
      status: "Under Review",
      notes: undefined,
      appliedAt: "2026-06-09T08:30:00.000Z",
      updatedAt: "2026-06-09T08:30:00.000Z",
    });

    expect(
      toFacility({
        id: "facility-1",
        name: "Cure Hospital",
        type: "Hospital",
        location: "Harare",
        verified: true,
        rating: "4.80",
        openRoles: 12,
        logoColor: null,
        initials: null,
        createdAt: now,
        updatedAt: now,
      }),
    ).toMatchObject({
      id: "facility-1",
      rating: 4.8,
      logoColor: "from-slate-400 to-slate-600",
      initials: "CU",
    });

    expect(
      toUser({
        id: "pro-1",
        email: "pro@example.com",
        role: "professional",
        name: "Tinashe Moyo",
        title: null,
        location: "Harare",
        avatarUrl: null,
        verified: true,
        profession: "Registered Nurse",
        cpdCredits: "15.50",
        cpdTarget: null,
        facilityId: null,
        registeringBody: null,
        registrationNumber: null,
        createdAt: now,
        updatedAt: now,
      }),
    ).toMatchObject({
      id: "pro-1",
      cpdCredits: 15.5,
      cpdTarget: undefined,
    });
  });
});

describe("repository configuration guards", () => {
  const originalUrl = process.env.SUPABASE_DB_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.SUPABASE_DB_URL;
    } else {
      process.env.SUPABASE_DB_URL = originalUrl;
    }
  });

  it("returns empty/null results when Postgres is not configured", async () => {
    delete process.env.SUPABASE_DB_URL;

    await expect(listOpenJobsWithFacility(5)).resolves.toEqual([]);
    await expect(getApplicationsForProfessional("pro-1")).resolves.toEqual([]);
    await expect(listTopHiringFacilities(5)).resolves.toEqual([]);
    await expect(findUserByEmail("pro@example.com")).resolves.toBeNull();
    await expect(matchProfessionals({ profession: "Nurse", location: "Any" })).resolves.toEqual([]);
    await expect(getEmergencyAlertsForProfessional("pro-1")).resolves.toEqual([]);
    await expect(
      createJob({
        facilityId: "11111111-1111-4111-8111-111111111111",
        title: "Registered Nurse",
        location: "Harare",
        type: "Locum",
        description: "Night shift cover",
      }),
    ).resolves.toBeNull();
    await expect(
      createApplication({
        jobId: "22222222-2222-4222-8222-222222222222",
        professionalId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toBeNull();
  });
});
