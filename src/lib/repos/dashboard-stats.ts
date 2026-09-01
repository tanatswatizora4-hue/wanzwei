import "server-only";

import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import {
  applications,
  courses,
  emergencyAlertRecipients,
  emergencyAlerts,
  facilities,
  interviews,
  jobs,
  listings,
  notifications,
  savedJobs,
  users,
  verifications,
} from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { ApplicationStatus, JobStatus } from "@/lib/types";
import type { ApplicationWithJob } from "./applications";
import { toApplication } from "./applications";
import { toFacility } from "./facilities";
import { toJob } from "./jobs";
import { toUser } from "./users";

const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Under Review",
  "Screening",
  "Shortlisted",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const JOB_STATUSES: JobStatus[] = [
  "Open",
  "Interested",
  "Shortlisted",
  "Matched",
  "Closed",
];

const WEEK_BUCKETS = 13;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export type StatTrend = {
  value: number;
  trend?: number[];
  delta?: number;
  deltaLabel?: string;
};

export type ProfessionalDashboardStats = {
  applications: StatTrend;
  savedJobs: StatTrend;
  interviews: StatTrend;
  cpdCredits: StatTrend;
  unreadNotifications: number;
  activeEmergencyAlerts: number;
};

export type FacilityDashboardStats = {
  openJobs: StatTrend;
  totalApplicants: StatTrend;
  interviewsScheduled: StatTrend;
  hiresThisMonth: StatTrend;
  activeEmergencyAlerts: number;
  closedJobs: number;
  applicationPipeline: { label: string; value: number; tone: "emerald" | "sky" | "amber" | "violet" | "slate" }[];
  avgDaysToHire: number | null;
};

export type AdminDashboardStats = {
  totalUsers: StatTrend & { spark: number[] };
  verifiedPros: StatTrend & { spark: number[] };
  activeJobs: StatTrend & { spark: number[] };
  hiresMtd: StatTrend & { spark: number[] };
  professionalsCount: number;
  facilitiesCount: number;
  totalApplications: number;
  pendingVerifications: number;
  underReviewVerifications: number;
  unverifiedProfessionalsCount: number;
  verifiedFacilitiesCount: number;
  unverifiedFacilitiesCount: number;
  activeEmergencyAlerts: number;
  marketplaceListings: number;
  cpdCourses: number;
  growthChart: { label: string; users: number; hires: number }[];
};

export type ActivityItem = {
  id: string;
  type: "application" | "user" | "job";
  title: string;
  subtitle: string;
  occurredAt: string;
};

function emptyStat(): StatTrend {
  return { value: 0, deltaLabel: "Not enough data" };
}

function buildWeeklyTrend(dates: Date[], buckets = WEEK_BUCKETS): number[] {
  const now = Date.now();
  const trend = Array.from({ length: buckets }, () => 0);
  for (const date of dates) {
    const weeksAgo = Math.floor((now - date.getTime()) / MS_PER_WEEK);
    const index = buckets - 1 - weeksAgo;
    if (index >= 0 && index < buckets) {
      trend[index]++;
    }
  }
  return trend;
}

function computeDelta(dates: Date[], periodDays = 30): number | undefined {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentStart = now - periodDays * msPerDay;
  const previousStart = now - periodDays * 2 * msPerDay;

  let current = 0;
  let previous = 0;
  for (const date of dates) {
    const t = date.getTime();
    if (t >= currentStart) current++;
    else if (t >= previousStart && t < currentStart) previous++;
  }

  if (previous === 0) return current === 0 ? 0 : undefined;
  return Math.round(((current - previous) / previous) * 100);
}

function withTrend(
  value: number,
  dates: Date[],
  deltaLabel = "vs. last 30 days",
): StatTrend {
  const trend = buildWeeklyTrend(dates);
  const hasHistory = trend.some((n) => n > 0);
  return {
    value,
    trend: hasHistory ? trend : undefined,
    delta: computeDelta(dates),
    deltaLabel: hasHistory ? deltaLabel : "Not enough data",
  };
}

export async function getApplicationCountsByStatus(
  scope:
    | { professionalId: string }
    | { facilityId: string }
    | "platform",
): Promise<Record<ApplicationStatus, number>> {
  const counts = Object.fromEntries(
    APPLICATION_STATUSES.map((status) => [status, 0]),
  ) as Record<ApplicationStatus, number>;

  if (!hasDbConfig()) return counts;

  const db = getDb();
  let rows: { status: ApplicationStatus; count: number }[];

  if (scope === "platform") {
    rows = await db
      .select({
        status: applications.status,
        count: count(),
      })
      .from(applications)
      .groupBy(applications.status);
  } else if ("professionalId" in scope) {
    rows = await db
      .select({
        status: applications.status,
        count: count(),
      })
      .from(applications)
      .where(eq(applications.professionalId, scope.professionalId))
      .groupBy(applications.status);
  } else {
    rows = await db
      .select({
        status: applications.status,
        count: count(),
      })
      .from(applications)
      .innerJoin(jobs, eq(jobs.id, applications.jobId))
      .where(eq(jobs.facilityId, scope.facilityId))
      .groupBy(applications.status);
  }

  for (const row of rows) {
    counts[row.status] = Number(row.count);
  }
  return counts;
}

export async function getJobCountsByStatus(
  facilityId: string,
): Promise<Record<JobStatus, number>> {
  const counts = Object.fromEntries(
    JOB_STATUSES.map((status) => [status, 0]),
  ) as Record<JobStatus, number>;

  if (!hasDbConfig()) return counts;

  const db = getDb();
  const rows = await db
    .select({
      status: jobs.status,
      count: count(),
    })
    .from(jobs)
    .where(eq(jobs.facilityId, facilityId))
    .groupBy(jobs.status);

  for (const row of rows) {
    counts[row.status] = Number(row.count);
  }
  return counts;
}

export async function getRecentActivity(
  limit = 10,
): Promise<ActivityItem[]> {
  if (!hasDbConfig()) return [];

  return withRepositoryLogging("dashboard-stats", "getRecentActivity", async () => {
    const db = getDb();
    const [applicationRows, userRows, jobRows] = await Promise.all([
      db
        .select({
          id: applications.id,
          appliedAt: applications.appliedAt,
          jobTitle: jobs.title,
          professionalName: users.name,
        })
        .from(applications)
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .innerJoin(users, eq(users.id, applications.professionalId))
        .orderBy(desc(applications.appliedAt))
        .limit(limit),
      db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit),
      db
        .select({
          id: jobs.id,
          title: jobs.title,
          postedAt: jobs.postedAt,
          facilityName: facilities.name,
        })
        .from(jobs)
        .innerJoin(facilities, eq(facilities.id, jobs.facilityId))
        .orderBy(desc(jobs.postedAt))
        .limit(limit),
    ]);

    const items: ActivityItem[] = [
      ...applicationRows.map((row) => ({
        id: `app-${row.id}`,
        type: "application" as const,
        title: `${row.professionalName} applied`,
        subtitle: row.jobTitle,
        occurredAt: row.appliedAt.toISOString(),
      })),
      ...userRows.map((row) => ({
        id: `user-${row.id}`,
        type: "user" as const,
        title: `${row.name} joined`,
        subtitle: row.role,
        occurredAt: row.createdAt.toISOString(),
      })),
      ...jobRows.map((row) => ({
        id: `job-${row.id}`,
        type: "job" as const,
        title: row.title,
        subtitle: row.facilityName,
        occurredAt: row.postedAt.toISOString(),
      })),
    ];

    return items
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )
      .slice(0, limit);
  }, { limit });
}

export async function getProfessionalDashboardStats(
  userId: string,
): Promise<ProfessionalDashboardStats> {
  if (!hasDbConfig()) {
    return {
      applications: emptyStat(),
      savedJobs: emptyStat(),
      interviews: emptyStat(),
      cpdCredits: { value: 0, deltaLabel: "Not enough data" },
      unreadNotifications: 0,
      activeEmergencyAlerts: 0,
    };
  }

  return withRepositoryLogging(
    "dashboard-stats",
    "getProfessionalDashboardStats",
    async () => {
      const db = getDb();
      const now = new Date();

      const [
        applicationDates,
        savedDates,
        interviewDates,
        upcomingInterviews,
        savedCount,
        unreadCount,
        activeAlerts,
        userRow,
      ] = await Promise.all([
        db
          .select({ appliedAt: applications.appliedAt })
          .from(applications)
          .where(eq(applications.professionalId, userId)),
        db
          .select({ createdAt: savedJobs.createdAt })
          .from(savedJobs)
          .where(eq(savedJobs.userId, userId)),
        db
          .select({ date: interviews.date })
          .from(interviews)
          .where(eq(interviews.professionalId, userId)),
        db
          .select({ count: count() })
          .from(interviews)
          .where(
            and(
              eq(interviews.professionalId, userId),
              gte(interviews.date, now),
            ),
          ),
        db
          .select({ count: count() })
          .from(savedJobs)
          .where(eq(savedJobs.userId, userId)),
        db
          .select({ count: count() })
          .from(notifications)
          .where(
            and(eq(notifications.userId, userId), eq(notifications.unread, true)),
          ),
        db
          .select({ count: count() })
          .from(emergencyAlerts)
          .innerJoin(
            emergencyAlertRecipients,
            eq(emergencyAlertRecipients.alertId, emergencyAlerts.id),
          )
          .where(
            and(
              eq(emergencyAlertRecipients.professionalId, userId),
              eq(emergencyAlerts.status, "Sent"),
              gte(emergencyAlerts.expiresAt, now),
            ),
          ),
        db.select().from(users).where(eq(users.id, userId)).limit(1),
      ]);

      const upcomingInterviewDates = interviewDates
        .map((row) => row.date)
        .filter((date) => date >= now);

      return {
        applications: withTrend(
          applicationDates.length,
          applicationDates.map((row) => row.appliedAt),
        ),
        savedJobs: withTrend(
          Number(savedCount[0]?.count ?? 0),
          savedDates.map((row) => row.createdAt),
        ),
        interviews: withTrend(
          Number(upcomingInterviews[0]?.count ?? 0),
          upcomingInterviewDates,
        ),
        cpdCredits: {
          value: Number(userRow[0]?.cpdCredits ?? 0),
          deltaLabel: "From your profile",
        },
        unreadNotifications: Number(unreadCount[0]?.count ?? 0),
        activeEmergencyAlerts: Number(activeAlerts[0]?.count ?? 0),
      };
    },
    { userId },
  );
}

export async function getFacilityDashboardStats(
  facilityId: string,
): Promise<FacilityDashboardStats> {
  const emptyPipeline = [
    { label: "Open", value: 0, tone: "emerald" as const },
    { label: "Interested", value: 0, tone: "sky" as const },
    { label: "Shortlisted", value: 0, tone: "amber" as const },
    { label: "Matched", value: 0, tone: "violet" as const },
    { label: "Closed", value: 0, tone: "slate" as const },
  ];

  if (!hasDbConfig()) {
    return {
      openJobs: emptyStat(),
      totalApplicants: emptyStat(),
      interviewsScheduled: emptyStat(),
      hiresThisMonth: emptyStat(),
      activeEmergencyAlerts: 0,
      closedJobs: 0,
      applicationPipeline: emptyPipeline,
      avgDaysToHire: null,
    };
  }

  return withRepositoryLogging(
    "dashboard-stats",
    "getFacilityDashboardStats",
    async () => {
      const db = getDb();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const statusCounts = await getApplicationCountsByStatus({ facilityId });
      const jobCounts = await getJobCountsByStatus(facilityId);

      const [
        applicationDates,
        interviewDates,
        hiresThisMonth,
        activeAlerts,
        openJobDates,
      ] = await Promise.all([
        db
          .select({ appliedAt: applications.appliedAt })
          .from(applications)
          .innerJoin(jobs, eq(jobs.id, applications.jobId))
          .where(eq(jobs.facilityId, facilityId)),
        db
          .select({ date: interviews.date })
          .from(interviews)
          .innerJoin(jobs, eq(jobs.id, interviews.jobId))
          .where(
            and(eq(jobs.facilityId, facilityId), gte(interviews.date, now)),
          ),
        db
          .select({ count: count() })
          .from(applications)
          .innerJoin(jobs, eq(jobs.id, applications.jobId))
          .where(
            and(
              eq(jobs.facilityId, facilityId),
              eq(applications.status, "Hired"),
              gte(applications.updatedAt, monthStart),
            ),
          ),
        db
          .select({ count: count() })
          .from(emergencyAlerts)
          .where(
            and(
              eq(emergencyAlerts.facilityId, facilityId),
              eq(emergencyAlerts.status, "Sent"),
              gte(emergencyAlerts.expiresAt, now),
            ),
          ),
        db
          .select({ postedAt: jobs.postedAt })
          .from(jobs)
          .where(
            and(eq(jobs.facilityId, facilityId), eq(jobs.status, "Open")),
          ),
      ]);

      const hiredRows = await db
        .select({
          appliedAt: applications.appliedAt,
          updatedAt: applications.updatedAt,
        })
        .from(applications)
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .where(
          and(eq(jobs.facilityId, facilityId), eq(applications.status, "Hired")),
        );

      let avgDaysToHire: number | null = null;
      if (hiredRows.length > 0) {
        const totalDays = hiredRows.reduce((sum, row) => {
          const days =
            (row.updatedAt.getTime() - row.appliedAt.getTime()) /
            (24 * 60 * 60 * 1000);
          return sum + Math.max(0, days);
        }, 0);
        avgDaysToHire = Math.round(totalDays / hiredRows.length);
      }

      const pipeline = [
        {
          label: "Open",
          value: statusCounts["Under Review"],
          tone: "emerald" as const,
        },
        {
          label: "Interested",
          value: statusCounts.Screening,
          tone: "sky" as const,
        },
        {
          label: "Shortlisted",
          value: statusCounts.Shortlisted,
          tone: "amber" as const,
        },
        {
          label: "Matched",
          value: statusCounts.Interview + statusCounts.Offer,
          tone: "violet" as const,
        },
        {
          label: "Closed",
          value: statusCounts.Hired + statusCounts.Rejected,
          tone: "slate" as const,
        },
      ];

      const totalApplicants = applicationDates.length;
      const openJobs = openJobDates.length;

      return {
        openJobs: withTrend(
          openJobs,
          openJobDates.map((row) => row.postedAt),
        ),
        totalApplicants: withTrend(
          totalApplicants,
          applicationDates.map((row) => row.appliedAt),
        ),
        interviewsScheduled: withTrend(
          interviewDates.length,
          interviewDates.map((row) => row.date),
        ),
        hiresThisMonth: withTrend(
          Number(hiresThisMonth[0]?.count ?? 0),
          hiredRows
            .filter((row) => row.updatedAt >= monthStart)
            .map((row) => row.updatedAt),
          "this month",
        ),
        activeEmergencyAlerts: Number(activeAlerts[0]?.count ?? 0),
        closedJobs: jobCounts.Closed,
        applicationPipeline: pipeline,
        avgDaysToHire,
      };
    },
    { facilityId },
  );
}

export async function listRecentApplicationsForFacility(
  facilityId: string,
  limit = 5,
): Promise<ApplicationWithJob[]> {
  if (!hasDbConfig()) return [];

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

  return rows.map((row) => ({
    application: toApplication(row.application),
    job: toJob(row.job),
    facility: toFacility(row.facility),
    professional: toUser(row.professional),
  }));
}

async function getMonthlyGrowth(
  months: number,
): Promise<{ label: string; users: number; hires: number }[]> {
  const db = getDb();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [userRows, hireRows] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${users.createdAt}), 'Mon')`,
        bucket: sql<string>`date_trunc('month', ${users.createdAt})`,
        total: count(),
      })
      .from(users)
      .where(gte(users.createdAt, start))
      .groupBy(
        sql`date_trunc('month', ${users.createdAt})`,
        sql`to_char(date_trunc('month', ${users.createdAt}), 'Mon')`,
      )
      .orderBy(sql`date_trunc('month', ${users.createdAt})`),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${applications.updatedAt}), 'Mon')`,
        bucket: sql<string>`date_trunc('month', ${applications.updatedAt})`,
        total: count(),
      })
      .from(applications)
      .where(
        and(
          eq(applications.status, "Hired"),
          gte(applications.updatedAt, start),
        ),
      )
      .groupBy(
        sql`date_trunc('month', ${applications.updatedAt})`,
        sql`to_char(date_trunc('month', ${applications.updatedAt}), 'Mon')`,
      )
      .orderBy(sql`date_trunc('month', ${applications.updatedAt})`),
  ]);

  const buckets: { label: string; users: number; hires: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const label = d.toLocaleString("en", { month: "short" });
    const bucketKey = d.toISOString().slice(0, 7);
    const usersCount =
      userRows.find((row) => String(row.bucket).startsWith(bucketKey))?.total ??
      0;
    const hiresCount =
      hireRows.find((row) => String(row.bucket).startsWith(bucketKey))?.total ??
      0;
    buckets.push({
      label,
      users: Number(usersCount),
      hires: Number(hiresCount),
    });
  }
  return buckets;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const emptySpark = Array.from({ length: 12 }, () => 0);

  if (!hasDbConfig()) {
    return {
      totalUsers: { value: 0, spark: emptySpark, deltaLabel: "Not enough data" },
      verifiedPros: { value: 0, spark: emptySpark, deltaLabel: "Not enough data" },
      activeJobs: { value: 0, spark: emptySpark, deltaLabel: "Not enough data" },
      hiresMtd: { value: 0, spark: emptySpark, deltaLabel: "Not enough data" },
      professionalsCount: 0,
      facilitiesCount: 0,
      totalApplications: 0,
      pendingVerifications: 0,
      underReviewVerifications: 0,
      unverifiedProfessionalsCount: 0,
      verifiedFacilitiesCount: 0,
      unverifiedFacilitiesCount: 0,
      activeEmergencyAlerts: 0,
      marketplaceListings: 0,
      cpdCourses: 0,
      growthChart: [],
    };
  }

  return withRepositoryLogging("dashboard-stats", "getAdminDashboardStats", async () => {
    const db = getDb();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      userDates,
      proDates,
      jobDates,
      hireDates,
      professionals,
      facilityCount,
      applicationsTotal,
      pendingVerifications,
      activeAlerts,
      listingCount,
      courseCount,
      verifiedPros,
      openJobs,
      hiresMtd,
      underReviewCount,
      unverifiedPros,
      verifiedFacilities,
      unverifiedFacilities,
    ] = await Promise.all([
      db.select({ createdAt: users.createdAt }).from(users),
      db
        .select({ createdAt: users.createdAt })
        .from(users)
        .where(eq(users.role, "professional")),
      db
        .select({ postedAt: jobs.postedAt })
        .from(jobs)
        .where(eq(jobs.status, "Open")),
      db
        .select({ updatedAt: applications.updatedAt })
        .from(applications)
        .where(eq(applications.status, "Hired")),
      db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "professional")),
      db.select({ count: count() }).from(facilities),
      db.select({ count: count() }).from(applications),
      db
        .select({ count: count() })
        .from(verifications)
        .where(inArray(verifications.status, ["Pending", "Under Review"])),
      db
        .select({ count: count() })
        .from(emergencyAlerts)
        .where(
          and(
            eq(emergencyAlerts.status, "Sent"),
            gte(emergencyAlerts.expiresAt, now),
          ),
        ),
      db.select({ count: count() }).from(listings),
      db.select({ count: count() }).from(courses),
      db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, "professional"), eq(users.verified, true))),
      db
        .select({ count: count() })
        .from(jobs)
        .where(eq(jobs.status, "Open")),
      db
        .select({ count: count() })
        .from(applications)
        .where(
          and(
            eq(applications.status, "Hired"),
            gte(applications.updatedAt, monthStart),
          ),
        ),
      db
        .select({ count: count() })
        .from(verifications)
        .where(eq(verifications.status, "Under Review")),
      db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, "professional"), eq(users.verified, false))),
      db
        .select({ count: count() })
        .from(facilities)
        .where(eq(facilities.verified, true)),
      db
        .select({ count: count() })
        .from(facilities)
        .where(eq(facilities.verified, false)),
    ]);

    const growthChart = await getMonthlyGrowth(8);

    return {
      totalUsers: {
        ...withTrend(userDates.length, userDates.map((row) => row.createdAt)),
        spark: buildWeeklyTrend(userDates.map((row) => row.createdAt), 12),
      },
      verifiedPros: {
        value: Number(verifiedPros[0]?.count ?? 0),
        deltaLabel: "verified professionals",
        spark: buildWeeklyTrend(proDates.map((row) => row.createdAt), 12),
      },
      activeJobs: {
        value: Number(openJobs[0]?.count ?? 0),
        trend: buildWeeklyTrend(jobDates.map((row) => row.postedAt)),
        delta: computeDelta(jobDates.map((row) => row.postedAt)),
        spark: buildWeeklyTrend(jobDates.map((row) => row.postedAt), 12),
      },
      hiresMtd: {
        value: Number(hiresMtd[0]?.count ?? 0),
        trend: buildWeeklyTrend(
          hireDates
            .filter((row) => row.updatedAt >= monthStart)
            .map((row) => row.updatedAt),
        ),
        deltaLabel: "this month",
        spark: buildWeeklyTrend(hireDates.map((row) => row.updatedAt), 12),
      },
      professionalsCount: Number(professionals[0]?.count ?? 0),
      facilitiesCount: Number(facilityCount[0]?.count ?? 0),
      totalApplications: Number(applicationsTotal[0]?.count ?? 0),
      pendingVerifications: Number(pendingVerifications[0]?.count ?? 0),
      underReviewVerifications: Number(underReviewCount[0]?.count ?? 0),
      unverifiedProfessionalsCount: Number(unverifiedPros[0]?.count ?? 0),
      verifiedFacilitiesCount: Number(verifiedFacilities[0]?.count ?? 0),
      unverifiedFacilitiesCount: Number(unverifiedFacilities[0]?.count ?? 0),
      activeEmergencyAlerts: Number(activeAlerts[0]?.count ?? 0),
      marketplaceListings: Number(listingCount[0]?.count ?? 0),
      cpdCourses: Number(courseCount[0]?.count ?? 0),
      growthChart,
    };
  });
}
