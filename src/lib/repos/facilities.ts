import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { facilities, users } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { Facility as DbFacilityRow } from "@/lib/db/schema";
import type { Facility } from "@/lib/types";

/**
 * Convert a Drizzle row into the legacy UI `Facility` shape so the
 * existing components don't need to change. `rating` is a `numeric`
 * column → Drizzle returns it as a string, so we coerce.
 */
export function toFacility(row: DbFacilityRow): Facility {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    location: row.location,
    verified: row.verified,
    rating: Number(row.rating),
    openRoles: row.openRoles,
    // The two display-only fields can be null in the DB; provide
    // visually safe defaults so the UI never sees `undefined`.
    logoColor: row.logoColor ?? "from-slate-400 to-slate-600",
    initials: row.initials ?? row.name.slice(0, 2).toUpperCase(),
  };
}

/**
 * Top N facilities by open-role count. Used by the professional
 * dashboard's "Top Facilities Hiring" card.
 */
export async function listTopHiringFacilities(
  limit: number,
): Promise<Facility[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("facilities", "listTopHiringFacilities", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(facilities)
      .orderBy(desc(facilities.openRoles))
      .limit(limit);
    return rows.map(toFacility);
  }, { limit });
}

export async function listFacilities(limit = 100): Promise<Facility[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("facilities", "listFacilities", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(facilities)
      .orderBy(desc(facilities.openRoles))
      .limit(limit);
    return rows.map(toFacility);
  }, { limit });
}

export async function listFacilitiesByIds(ids: string[]): Promise<Facility[]> {
  if (!hasDbConfig() || ids.length === 0) return [];
  return withRepositoryLogging("facilities", "listFacilitiesByIds", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(facilities)
      .where(inArray(facilities.id, ids));
    return rows.map(toFacility);
  }, { count: ids.length });
}

export async function getFacility(id: string): Promise<Facility | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("facilities", "getFacility", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, id))
      .limit(1);
    return rows[0] ? toFacility(rows[0]) : null;
  }, { id });
}

/**
 * Resolve the facility a given user belongs to via `users.facility_id`.
 *
 * Returns null when the user has no facility (e.g. they're a
 * professional, or their row hasn't been seeded yet). The caller is
 * responsible for falling back gracefully — see the facility dashboard
 * page.
 */
export async function findFacilityForUserEmail(
  email: string,
): Promise<Facility | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("facilities", "findFacilityForUserEmail", async () => {
    const db = getDb();
    const rows = await db
      .select({ facility: facilities })
      .from(facilities)
      .innerJoin(users, eq(users.facilityId, facilities.id))
      .where(eq(users.email, email))
      .limit(1);
    if (!rows[0]) return null;
    return toFacility(rows[0].facility);
  }, { email });
}
