import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { facilities, jobs, savedJobs, users, applications } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type {
  DbJob,
  DbSavedJob,
  NewDbJob,
  NewDbSavedJob,
} from "@/lib/db/schema";
import type { Facility, Job } from "@/lib/types";
import { toFacility } from "./facilities";

/**
 * Convert a Drizzle row into the UI `Job` shape so the existing components
 * don't need to change.
 *
 * Date fields are emitted as ISO strings for client rendering.
 * Per-user saved state is populated by saved-job helpers below; generic job
 * reads default to `false` until a caller asks for a user-specific view.
 */
export function toJob(row: DbJob): Job {
  return {
    id: row.id,
    title: row.title,
    facilityId: row.facilityId,
    location: row.location,
    type: row.type,
    salary: row.salary ?? undefined,
    postedAt: row.postedAt.toISOString(),
    status: row.status,
    applicants: row.applicantsCount,
    description: row.description,
    tags: row.tags,
    saved: false,
  };
}

/** Pre-joined shape used by the professional dashboard and jobs page. */
export type JobWithFacility = { job: Job; facility: Facility };

/**
 * Recently-posted open jobs across all facilities. Joined with the
 * facility so the caller doesn't need a second roundtrip.
 *
 * Used by the professional dashboard's "Recommended Jobs" card and
 * the public "Browse Jobs" page.
 */
export type JobWithFacilityAndUserState = JobWithFacility & {
  job: Job & { saved: boolean; applied: boolean };
};

export async function listOpenJobsWithFacility(
  limit: number,
): Promise<JobWithFacility[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("jobs", "listOpenJobsWithFacility", async () => {
    const db = getDb();
    const rows = await db
      .select({ job: jobs, facility: facilities })
      .from(jobs)
      .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
      .where(eq(jobs.status, "Open"))
      .orderBy(desc(jobs.postedAt))
      .limit(limit);
    return rows.map((r) => ({
      job: toJob(r.job),
      facility: toFacility(r.facility),
    }));
  }, { limit });
}

export async function listOpenJobsWithFacilityForProfessional(
  professionalId: string,
  limit: number,
): Promise<JobWithFacilityAndUserState[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "jobs",
    "listOpenJobsWithFacilityForProfessional",
    async () => {
      const db = getDb();
      const rows = await db
        .select({ job: jobs, facility: facilities })
        .from(jobs)
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .where(eq(jobs.status, "Open"))
        .orderBy(desc(jobs.postedAt))
        .limit(limit);

      if (rows.length === 0) return [];

      const jobIds = rows.map((r) => r.job.id);
      const savedRows = await db
        .select({ jobId: savedJobs.jobId })
        .from(savedJobs)
        .where(
          and(
            eq(savedJobs.userId, professionalId),
            inArray(savedJobs.jobId, jobIds),
          ),
        );
      const savedIds = new Set(savedRows.map((r) => r.jobId));

      const appliedRows = await db
        .select({ jobId: applications.jobId })
        .from(applications)
        .where(
          and(
            eq(applications.professionalId, professionalId),
            inArray(applications.jobId, jobIds),
          ),
        );
      const appliedIds = new Set(appliedRows.map((r) => r.jobId));

      return rows.map((r) => ({
        job: {
          ...toJob(r.job),
          saved: savedIds.has(r.job.id),
          applied: appliedIds.has(r.job.id),
        },
        facility: toFacility(r.facility),
      }));
    },
    { professionalId, limit },
  );
}

export async function incrementJobApplicantsCount(
  jobId: string,
): Promise<void> {
  if (!hasDbConfig()) return;
  const db = getDb();
  await db
    .update(jobs)
    .set({ applicantsCount: sql`${jobs.applicantsCount} + 1` })
    .where(eq(jobs.id, jobId));
}

export async function listJobsWithFacility(
  limit = 100,
): Promise<JobWithFacility[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("jobs", "listJobsWithFacility", async () => {
    const db = getDb();
    const rows = await db
      .select({ job: jobs, facility: facilities })
      .from(jobs)
      .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
      .orderBy(desc(jobs.postedAt))
      .limit(limit);
    return rows.map((r) => ({
      job: toJob(r.job),
      facility: toFacility(r.facility),
    }));
  }, { limit });
}

/**
 * Recent postings for a given facility, used by the facility
 * dashboard's "Recent postings" table. No facility join needed since
 * the caller already has the facility object.
 */
export async function listJobsForFacility(
  facilityId: string,
  limit: number,
): Promise<Job[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("jobs", "listJobsForFacility", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(jobs)
      .where(eq(jobs.facilityId, facilityId))
      .orderBy(desc(jobs.postedAt))
      .limit(limit);
    return rows.map(toJob);
  }, { facilityId, limit });
}

export async function getJobsForFacility(
  facilityId: string,
  limit = 50,
): Promise<Job[]> {
  return listJobsForFacility(facilityId, limit);
}

export async function createJob(job: NewDbJob): Promise<Job | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("jobs", "createJob", async () => {
    const db = getDb();
    const rows = await db.insert(jobs).values(job).returning();
    return rows[0] ? toJob(rows[0]) : null;
  }, { facilityId: job.facilityId });
}

export async function closeJobForFacility(
  jobId: string,
  facilityId: string,
): Promise<Job | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("jobs", "closeJobForFacility", async () => {
    const db = getDb();
    const rows = await db
      .update(jobs)
      .set({ status: "Closed" })
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.facilityId, facilityId),
          eq(jobs.status, "Open"),
        ),
      )
      .returning();
    return rows[0] ? toJob(rows[0]) : null;
  }, { jobId, facilityId });
}

export async function getSavedJobsForUser(userId: string): Promise<Job[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("jobs", "getSavedJobsForUser", async () => {
    const db = getDb();
    const rows = await db
      .select({ job: jobs })
      .from(savedJobs)
      .innerJoin(jobs, eq(jobs.id, savedJobs.jobId))
      .where(eq(savedJobs.userId, userId))
      .orderBy(desc(savedJobs.createdAt));
    return rows.map((row) => ({ ...toJob(row.job), saved: true }));
  }, { userId });
}

export async function getSavedJobsWithFacilityForUserEmail(
  email: string,
): Promise<JobWithFacility[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "jobs",
    "getSavedJobsWithFacilityForUserEmail",
    async () => {
      const db = getDb();
      const rows = await db
        .select({ job: jobs, facility: facilities })
        .from(savedJobs)
        .innerJoin(jobs, eq(jobs.id, savedJobs.jobId))
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .innerJoin(users, eq(users.id, savedJobs.userId))
        .where(eq(users.email, email))
        .orderBy(desc(savedJobs.createdAt));
      return rows.map((row) => ({
        job: { ...toJob(row.job), saved: true },
        facility: toFacility(row.facility),
      }));
    },
    { email },
  );
}

export async function saveJob(
  savedJob: NewDbSavedJob,
): Promise<DbSavedJob | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("jobs", "saveJob", async () => {
    const db = getDb();
    const rows = await db
      .insert(savedJobs)
      .values(savedJob)
      .onConflictDoNothing()
      .returning();
    return rows[0] ?? null;
  }, { userId: savedJob.userId, jobId: savedJob.jobId });
}

export async function unsaveJob(userId: string, jobId: string): Promise<boolean> {
  if (!hasDbConfig()) return false;
  return withRepositoryLogging("jobs", "unsaveJob", async () => {
    const db = getDb();
    const rows = await db
      .delete(savedJobs)
      .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
      .returning({ userId: savedJobs.userId });
    return rows.length > 0;
  }, { userId, jobId });
}
