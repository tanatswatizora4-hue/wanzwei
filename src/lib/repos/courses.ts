import "server-only";

import { and, desc, eq, ilike, or } from "drizzle-orm";

import { catalogueCoverClass } from "@/lib/catalogue/cover";
import {
  likeContainsPattern,
  type CpdSearchFilters,
} from "@/lib/cpd/search";
import { getDb, hasDbConfig } from "@/lib/db/client";
import { courses } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbCourse, NewDbCourse } from "@/lib/db/schema";
import type { Course } from "@/lib/types";

const DEFAULT_COVER = "from-violet-500 to-slate-800";

export function toCourse(row: DbCourse): Course {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider,
    category: row.category,
    duration: row.duration,
    credits: Number(row.credits),
    cover: catalogueCoverClass(row.cover, DEFAULT_COVER),
    recommended: row.recommended,
    description: row.description ?? "",
    format: row.format,
    location: row.location ?? undefined,
    startsAt: row.startsAt?.toISOString(),
    endsAt: row.endsAt?.toISOString(),
  };
}

function courseSearchWhere(filters?: CpdSearchFilters) {
  const clauses = [];
  if (filters?.category) {
    clauses.push(eq(courses.category, filters.category));
  }
  if (filters?.format) {
    clauses.push(eq(courses.format, filters.format));
  }
  if (filters?.q) {
    const pattern = likeContainsPattern(filters.q);
    clauses.push(
      or(
        ilike(courses.title, pattern),
        ilike(courses.provider, pattern),
        ilike(courses.description, pattern),
        ilike(courses.location, pattern),
      )!,
    );
  }
  return clauses.length ? and(...clauses) : undefined;
}

export async function listCourses(
  limit = 50,
  filters?: CpdSearchFilters,
): Promise<Course[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "courses",
    "listCourses",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(courses)
        .where(courseSearchWhere(filters))
        .orderBy(desc(courses.recommended), desc(courses.createdAt))
        .limit(limit);
      return rows.map(toCourse);
    },
    { limit, filters },
  );
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

export async function getCourseById(id: string): Promise<Course | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("courses", "getCourseById", async () => {
    const db = getDb();
    const rows = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    return rows[0] ? toCourse(rows[0]) : null;
  }, { id });
}

export async function createCourse(course: NewDbCourse): Promise<Course | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("courses", "createCourse", async () => {
    const db = getDb();
    const rows = await db.insert(courses).values(course).returning();
    return rows[0] ? toCourse(rows[0]) : null;
  });
}

export async function updateCourse(
  id: string,
  patch: Partial<NewDbCourse>,
): Promise<Course | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("courses", "updateCourse", async () => {
    const db = getDb();
    const rows = await db
      .update(courses)
      .set(patch)
      .where(eq(courses.id, id))
      .returning();
    return rows[0] ? toCourse(rows[0]) : null;
  }, { id });
}
