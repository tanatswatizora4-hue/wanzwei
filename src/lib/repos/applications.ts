import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { applications, facilities, jobs, users } from "@/lib/db/schema";
import { sendApplicationStatusEmail } from "@/lib/email/notifications";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbApplication, NewDbApplication } from "@/lib/db/schema";
import type { Application, Facility, Job, User } from "@/lib/types";
import { toFacility } from "./facilities";
import { incrementJobApplicantsCount, toJob } from "./jobs";
import { toUser } from "./users";

export function toApplication(row: DbApplication): Application {
  return {
    id: row.id,
    jobId: row.jobId,
    professionalId: row.professionalId,
    status: row.status,
    appliedAt: row.appliedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    notes: row.notes ?? undefined,
  };
}

/**
 * Pre-joined shape used by the professional dashboard's "Recent
 * Applications" card. Bundling the job + facility avoids N+1 lookups
 * in the page.
 */
export type ApplicationWithJob = {
  application: Application;
  job: Job;
  facility: Facility;
  professional?: User;
};

/**
 * The N most recent applications for the professional identified by email.
 * Auth and profile rows are still joined by email until auth users are linked
 * directly to `public.users` via foreign key.
 */
export async function listApplicationsForProfessional(
  email: string,
  limit: number,
): Promise<ApplicationWithJob[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "applications",
    "listApplicationsForProfessional",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          application: applications,
          job: jobs,
          facility: facilities,
        })
        .from(applications)
        .innerJoin(users, eq(users.id, applications.professionalId))
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .where(eq(users.email, email))
        .orderBy(desc(applications.appliedAt))
        .limit(limit);

      return rows.map((r) => ({
        application: toApplication(r.application),
        job: toJob(r.job),
        facility: toFacility(r.facility),
      }));
    },
    { email, limit },
  );
}

export async function findApplicationByJobAndProfessional(
  jobId: string,
  professionalId: string,
): Promise<Application | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "applications",
    "findApplicationByJobAndProfessional",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applications.professionalId, professionalId),
          ),
        )
        .limit(1);
      return rows[0] ? toApplication(rows[0]) : null;
    },
    { jobId, professionalId },
  );
}

export type ApplyForJobResult =
  | { ok: true; application: Application }
  | { ok: false; reason: "duplicate" | "job_not_found" | "job_closed" };

export async function applyForJob(
  jobId: string,
  professionalId: string,
): Promise<ApplyForJobResult> {
  if (!hasDbConfig()) {
    return { ok: false, reason: "job_not_found" };
  }
  return withRepositoryLogging(
    "applications",
    "applyForJob",
    async () => {
      const db = getDb();
      const jobRows = await db
        .select({ id: jobs.id, status: jobs.status })
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);
      const job = jobRows[0];
      if (!job) return { ok: false, reason: "job_not_found" };
      if (job.status !== "Open") return { ok: false, reason: "job_closed" };

      const existing = await findApplicationByJobAndProfessional(
        jobId,
        professionalId,
      );
      if (existing) return { ok: false, reason: "duplicate" };

      const rows = await db
        .insert(applications)
        .values({
          jobId,
          professionalId,
          status: "Under Review",
        })
        .returning();
      if (!rows[0]) return { ok: false, reason: "job_not_found" };

      await incrementJobApplicantsCount(jobId);
      const created = toApplication(rows[0]);
      await sendApplicationStatusNotification(created);
      return { ok: true, application: created };
    },
    { jobId, professionalId },
  );
}

export async function listApplicationsForFacility(
  facilityId: string,
  limit = 100,
): Promise<ApplicationWithJob[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "applications",
    "listApplicationsForFacility",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          application: applications,
          job: jobs,
          facility: facilities,
          professional: users,
        })
        .from(applications)
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .innerJoin(users, eq(users.id, applications.professionalId))
        .where(eq(jobs.facilityId, facilityId))
        .orderBy(desc(applications.appliedAt))
        .limit(limit);

      return rows.map((r) => ({
        application: toApplication(r.application),
        job: toJob(r.job),
        facility: toFacility(r.facility),
        professional: toUser(r.professional),
      }));
    },
    { facilityId, limit },
  );
}

export async function getApplicationById(
  id: string,
): Promise<Application | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("applications", "getApplicationById", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);
    return rows[0] ? toApplication(rows[0]) : null;
  }, { id });
}

export async function getApplicationForProfessional(
  applicationId: string,
  professionalId: string,
): Promise<ApplicationWithJob | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "applications",
    "getApplicationForProfessional",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          application: applications,
          job: jobs,
          facility: facilities,
        })
        .from(applications)
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .where(
          and(
            eq(applications.id, applicationId),
            eq(applications.professionalId, professionalId),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        application: toApplication(row.application),
        job: toJob(row.job),
        facility: toFacility(row.facility),
      };
    },
    { applicationId, professionalId },
  );
}

export async function getApplicationForFacility(
  applicationId: string,
  facilityId: string,
): Promise<ApplicationWithJob | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "applications",
    "getApplicationForFacility",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          application: applications,
          job: jobs,
          facility: facilities,
          professional: users,
        })
        .from(applications)
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .innerJoin(users, eq(users.id, applications.professionalId))
        .where(
          and(eq(applications.id, applicationId), eq(jobs.facilityId, facilityId)),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        application: toApplication(row.application),
        job: toJob(row.job),
        facility: toFacility(row.facility),
        professional: toUser(row.professional),
      };
    },
    { applicationId, facilityId },
  );
}

export async function listApplicationsForJob(
  jobId: string,
  facilityId: string,
): Promise<ApplicationWithJob[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "applications",
    "listApplicationsForJob",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          application: applications,
          job: jobs,
          facility: facilities,
          professional: users,
        })
        .from(applications)
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .innerJoin(users, eq(users.id, applications.professionalId))
        .where(and(eq(applications.jobId, jobId), eq(jobs.facilityId, facilityId)))
        .orderBy(desc(applications.appliedAt));
      return rows.map((r) => ({
        application: toApplication(r.application),
        job: toJob(r.job),
        facility: toFacility(r.facility),
        professional: toUser(r.professional),
      }));
    },
    { jobId, facilityId },
  );
}

export async function applicationBelongsToFacility(
  applicationId: string,
  facilityId: string,
): Promise<boolean> {
  if (!hasDbConfig()) return false;
  const db = getDb();
  const rows = await db
    .select({ id: applications.id })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .where(
      and(eq(applications.id, applicationId), eq(jobs.facilityId, facilityId)),
    )
    .limit(1);
  return rows.length > 0;
}

export async function listApplicationsWithDetails(
  limit = 100,
): Promise<ApplicationWithJob[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "applications",
    "listApplicationsWithDetails",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          application: applications,
          job: jobs,
          facility: facilities,
          professional: users,
        })
        .from(applications)
        .innerJoin(users, eq(users.id, applications.professionalId))
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .orderBy(desc(applications.appliedAt))
        .limit(limit);

      return rows.map((r) => ({
        application: toApplication(r.application),
        job: toJob(r.job),
        facility: toFacility(r.facility),
        professional: toUser(r.professional),
      }));
    },
    { limit },
  );
}

export async function getApplicationsForProfessional(
  professionalId: string,
  limit = 50,
): Promise<Application[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "applications",
    "getApplicationsForProfessional",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(applications)
        .where(eq(applications.professionalId, professionalId))
        .orderBy(desc(applications.appliedAt))
        .limit(limit);
      return rows.map(toApplication);
    },
    { professionalId, limit },
  );
}

export async function createApplication(
  application: NewDbApplication,
): Promise<Application | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("applications", "createApplication", async () => {
    const db = getDb();
    const rows = await db.insert(applications).values(application).returning();
    if (!rows[0]) return null;
    const created = toApplication(rows[0]);
    await sendApplicationStatusNotification(created);
    return created;
  }, { professionalId: application.professionalId, jobId: application.jobId });
}

export async function updateApplicationStatus(
  id: string,
  status: Application["status"],
): Promise<Application | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("applications", "updateApplicationStatus", async () => {
    const db = getDb();
    const currentRows = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);
    const previousStatus = currentRows[0]?.status;
    if (!previousStatus) return null;

    const rows = await db
      .update(applications)
      .set({ status, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    if (!rows[0]) return null;
    const updated = toApplication(rows[0]);
    if (previousStatus !== status) {
      await sendApplicationStatusNotification(updated);
    }
    return updated;
  }, { id, status });
}

async function sendApplicationStatusNotification(
  application: Application,
): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({
      professionalName: users.name,
      professionalEmail: users.email,
      jobTitle: jobs.title,
      facilityName: facilities.name,
    })
    .from(applications)
    .innerJoin(users, eq(users.id, applications.professionalId))
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
    .where(eq(applications.id, application.id))
    .limit(1);

  const details = rows[0];
  if (!details) return;

  await sendApplicationStatusEmail({
    to: details.professionalEmail,
    professionalName: details.professionalName,
    status: application.status,
    jobTitle: details.jobTitle,
    facilityName: details.facilityName,
  });
}
