import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { courses } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbCourse, NewDbCourse } from "@/lib/db/schema";
import type { Course } from "@/lib/types";

export function toCourse(row: DbCourse): Course {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider,
    category: row.category,
    duration: row.duration,
    credits: Number(row.credits),
    progress: row.progress,
    status: row.status,
    cover: row.cover,
    recommended: row.recommended,
  };
}

export async function listCourses(limit = 50): Promise<Course[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("courses", "listCourses", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(courses)
      .orderBy(desc(courses.recommended), desc(courses.createdAt))
      .limit(limit);
    return rows.map(toCourse);
  }, { limit });
}

export async function listRecommendedCourses(limit = 8): Promise<Course[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("courses", "listRecommendedCourses", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(courses)
      .where(eq(courses.recommended, true))
      .orderBy(desc(courses.createdAt))
      .limit(limit);
    return rows.map(toCourse);
  }, { limit });
}

export async function createCourse(course: NewDbCourse): Promise<Course | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("courses", "createCourse", async () => {
    const db = getDb();
    const rows = await db.insert(courses).values(course).returning();
    return rows[0] ? toCourse(rows[0]) : null;
  });
}
