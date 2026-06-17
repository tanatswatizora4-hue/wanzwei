import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { facilities, interviews, jobs, users } from "@/lib/db/schema";
import { sendInterviewInvitationEmail } from "@/lib/email/notifications";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbInterview, NewDbInterview } from "@/lib/db/schema";
import type { Facility, Interview, Job } from "@/lib/types";
import { toFacility } from "./facilities";
import { toJob } from "./jobs";

export function toInterview(row: DbInterview): Interview {
  return {
    id: row.id,
    jobId: row.jobId,
    professionalId: row.professionalId,
    date: row.date.toISOString(),
    duration: row.duration,
    mode: row.mode,
  };
}

export type InterviewWithJob = {
  interview: Interview;
  job: Job;
  facility: Facility;
};

export async function getInterviewsForProfessional(
  professionalId: string,
  limit = 50,
): Promise<Interview[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "interviews",
    "getInterviewsForProfessional",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(interviews)
        .where(eq(interviews.professionalId, professionalId))
        .orderBy(desc(interviews.date))
        .limit(limit);
      return rows.map(toInterview);
    },
    { professionalId, limit },
  );
}

export async function listInterviewsForProfessional(
  email: string,
  limit = 50,
): Promise<InterviewWithJob[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "interviews",
    "listInterviewsForProfessional",
    async () => {
      const db = getDb();
      const rows = await db
        .select({ interview: interviews, job: jobs, facility: facilities })
        .from(interviews)
        .innerJoin(users, eq(users.id, interviews.professionalId))
        .innerJoin(jobs, eq(jobs.id, interviews.jobId))
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .where(eq(users.email, email))
        .orderBy(desc(interviews.date))
        .limit(limit);
      return rows.map((row) => ({
        interview: toInterview(row.interview),
        job: toJob(row.job),
        facility: toFacility(row.facility),
      }));
    },
    { email, limit },
  );
}

export async function createInterview(
  interview: NewDbInterview,
): Promise<Interview | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("interviews", "createInterview", async () => {
    const db = getDb();
    const rows = await db.insert(interviews).values(interview).returning();
    if (!rows[0]) return null;
    const created = toInterview(rows[0]);
    await sendInterviewInvitation(created);
    return created;
  }, { professionalId: interview.professionalId, jobId: interview.jobId });
}

async function sendInterviewInvitation(interview: Interview): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({
      professionalName: users.name,
      professionalEmail: users.email,
      jobTitle: jobs.title,
      facilityName: facilities.name,
    })
    .from(interviews)
    .innerJoin(users, eq(users.id, interviews.professionalId))
    .innerJoin(jobs, eq(jobs.id, interviews.jobId))
    .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
    .where(eq(interviews.id, interview.id))
    .limit(1);

  const details = rows[0];
  if (!details) return;

  await sendInterviewInvitationEmail({
    to: details.professionalEmail,
    professionalName: details.professionalName,
    jobTitle: details.jobTitle,
    facilityName: details.facilityName,
    interviewDate: interview.date,
    duration: interview.duration,
    mode: interview.mode,
  });
}
