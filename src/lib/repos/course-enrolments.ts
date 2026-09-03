import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { creditsFromCompletedEnrolments } from "@/lib/cpd/credits";
import { getDb, hasDbConfig } from "@/lib/db/client";
import { courseEnrolments, courses, users } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbCourse, DbCourseEnrolment } from "@/lib/db/schema";
import type { Course, CourseEnrolment } from "@/lib/types";
import { toCourse } from "./courses";

export function toCourseEnrolment(row: DbCourseEnrolment): CourseEnrolment {
  return {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    status: row.status,
    enrolledAt: row.enrolledAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
}

export type EnrolmentWithCourse = {
  enrolment: CourseEnrolment;
  course: Course;
};

async function refreshUserCpdCredits(userId: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({
      status: courseEnrolments.status,
      credits: courses.credits,
    })
    .from(courseEnrolments)
    .innerJoin(courses, eq(courses.id, courseEnrolments.courseId))
    .where(eq(courseEnrolments.userId, userId));

  const earned = creditsFromCompletedEnrolments(
    rows.map((row) => ({
      status: row.status,
      credits: Number(row.credits),
    })),
  );

  await db
    .update(users)
    .set({ cpdCredits: String(earned) })
    .where(eq(users.id, userId));
}

export async function getEnrolmentForUserCourse(
  userId: string,
  courseId: string,
): Promise<CourseEnrolment | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "course_enrolments",
    "getEnrolmentForUserCourse",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(courseEnrolments)
        .where(
          and(
            eq(courseEnrolments.userId, userId),
            eq(courseEnrolments.courseId, courseId),
          ),
        )
        .limit(1);
      return rows[0] ? toCourseEnrolment(rows[0]) : null;
    },
    { userId, courseId },
  );
}

export async function listEnrolmentsForUser(
  userId: string,
): Promise<EnrolmentWithCourse[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "course_enrolments",
    "listEnrolmentsForUser",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          enrolment: courseEnrolments,
          course: courses,
        })
        .from(courseEnrolments)
        .innerJoin(courses, eq(courses.id, courseEnrolments.courseId))
        .where(eq(courseEnrolments.userId, userId))
        .orderBy(desc(courseEnrolments.enrolledAt));
      return rows.map((row) => ({
        enrolment: toCourseEnrolment(row.enrolment),
        course: toCourse(row.course as DbCourse),
      }));
    },
    { userId },
  );
}

export async function enrolUserInCourse(
  userId: string,
  courseId: string,
): Promise<CourseEnrolment | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "course_enrolments",
    "enrolUserInCourse",
    async () => {
      const db = getDb();
      const existing = await db
        .select()
        .from(courseEnrolments)
        .where(
          and(
            eq(courseEnrolments.userId, userId),
            eq(courseEnrolments.courseId, courseId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        if (existing[0].status === "withdrawn") {
          const rows = await db
            .update(courseEnrolments)
            .set({
              status: "registered",
              enrolledAt: sql`now()`,
              completedAt: null,
            })
            .where(eq(courseEnrolments.id, existing[0].id))
            .returning();
          return rows[0] ? toCourseEnrolment(rows[0]) : null;
        }
        return toCourseEnrolment(existing[0]);
      }

      const rows = await db
        .insert(courseEnrolments)
        .values({
          userId,
          courseId,
          status: "registered",
        })
        .returning();
      return rows[0] ? toCourseEnrolment(rows[0]) : null;
    },
    { userId, courseId },
  );
}

export async function completeEnrolmentForUser(
  userId: string,
  courseId: string,
): Promise<CourseEnrolment | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "course_enrolments",
    "completeEnrolmentForUser",
    async () => {
      const db = getDb();
      const rows = await db
        .update(courseEnrolments)
        .set({
          status: "completed",
          completedAt: sql`now()`,
        })
        .where(
          and(
            eq(courseEnrolments.userId, userId),
            eq(courseEnrolments.courseId, courseId),
            eq(courseEnrolments.status, "registered"),
          ),
        )
        .returning();
      if (!rows[0]) return null;
      await refreshUserCpdCredits(userId);
      return toCourseEnrolment(rows[0]);
    },
    { userId, courseId },
  );
}

export async function withdrawEnrolmentForUser(
  userId: string,
  courseId: string,
): Promise<CourseEnrolment | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "course_enrolments",
    "withdrawEnrolmentForUser",
    async () => {
      const db = getDb();
      const rows = await db
        .update(courseEnrolments)
        .set({
          status: "withdrawn",
          completedAt: null,
        })
        .where(
          and(
            eq(courseEnrolments.userId, userId),
            eq(courseEnrolments.courseId, courseId),
            eq(courseEnrolments.status, "registered"),
          ),
        )
        .returning();
      return rows[0] ? toCourseEnrolment(rows[0]) : null;
    },
    { userId, courseId },
  );
}
