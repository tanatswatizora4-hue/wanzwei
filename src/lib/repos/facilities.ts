import "server-only";

import { and, count, desc, eq, inArray } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { facilities, jobs, users } from "@/lib/db/schema";
import { facilityInitialsFromName } from "@/lib/facilities/initials";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { Facility as DbFacilityRow, NewFacility } from "@/lib/db/schema";
import type { Facility } from "@/lib/types";

const DEFAULT_FACILITY_LOGO = "from-slate-400 to-slate-600";

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

/** `facilities.open_roles` is stale denormalized data. Display counts come from jobs. */
export function withOpenJobCounts(
  items: Facility[],
  counts: Map<string, number>,
): Facility[] {
  return items.map((facility) => ({
    ...facility,
    openRoles: counts.get(facility.id) ?? 0,
  }));
}

async function loadOpenJobCounts(
  facilityIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!hasDbConfig() || facilityIds.length === 0) return counts;
  const db = getDb();
  const rows = await db
    .select({
      facilityId: jobs.facilityId,
      openCount: count(),
    })
    .from(jobs)
    .where(and(inArray(jobs.facilityId, facilityIds), eq(jobs.status, "Open")))
    .groupBy(jobs.facilityId);
  for (const row of rows) {
    counts.set(row.facilityId, Number(row.openCount));
  }
  return counts;
}

async function overlayOpenJobCounts(items: Facility[]): Promise<Facility[]> {
  return withOpenJobCounts(
    items,
    await loadOpenJobCounts(items.map((facility) => facility.id)),
  );
}

/**
 * Top N facilities by actual open jobs. Used by the professional
 * dashboard's "Top Facilities Hiring" card.
 */
export async function listTopHiringFacilities(
  limit: number,
): Promise<Facility[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("facilities", "listTopHiringFacilities", async () => {
    const db = getDb();
    const ranked = await db
      .select({
        facilityId: jobs.facilityId,
        openCount: count(),
      })
      .from(jobs)
      .where(eq(jobs.status, "Open"))
      .groupBy(jobs.facilityId)
      .orderBy(desc(count()))
      .limit(limit);
    if (ranked.length === 0) return [];
    const ids = ranked.map((row) => row.facilityId);
    const rows = await db
      .select()
      .from(facilities)
      .where(inArray(facilities.id, ids));
    const byId = new Map(rows.map((row) => [row.id, toFacility(row)]));
    const counts = new Map(
      ranked.map((row) => [row.facilityId, Number(row.openCount)]),
    );
    return ids.flatMap((id) => {
      const facility = byId.get(id);
      return facility ? withOpenJobCounts([facility], counts) : [];
    });
  }, { limit });
}

export async function listFacilities(limit = 100): Promise<Facility[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("facilities", "listFacilities", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(facilities)
      .orderBy(facilities.name)
      .limit(limit);
    return overlayOpenJobCounts(rows.map(toFacility));
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
    return overlayOpenJobCounts(rows.map(toFacility));
  }, { count: ids.length });
}

export async function listFacilitiesForAdmin(limit = 100): Promise<
  {
    facility: Facility;
    contactName: string | null;
    contactEmail: string | null;
  }[]
> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("facilities", "listFacilitiesForAdmin", async () => {
    const db = getDb();
    const rows = await db
      .select({
        facility: facilities,
        contactName: users.name,
        contactEmail: users.email,
      })
      .from(facilities)
      .leftJoin(
        users,
        and(eq(users.facilityId, facilities.id), eq(users.role, "facility")),
      )
      .orderBy(facilities.name)
      .limit(limit);

    const seen = new Set<string>();
    const result: {
      facility: Facility;
      contactName: string | null;
      contactEmail: string | null;
    }[] = [];
    for (const row of rows) {
      if (seen.has(row.facility.id)) continue;
      seen.add(row.facility.id);
      result.push({
        facility: toFacility(row.facility),
        contactName: row.contactName ?? null,
        contactEmail: row.contactEmail ?? null,
      });
    }
    const counted = await overlayOpenJobCounts(result.map((row) => row.facility));
    return result.map((row, index) => ({
      ...row,
      facility: counted[index] ?? row.facility,
    }));
  }, { limit });
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
    if (!rows[0]) return null;
    const [facility] = await overlayOpenJobCounts([toFacility(rows[0])]);
    return facility ?? null;
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
    const [facility] = await overlayOpenJobCounts([
      toFacility(rows[0].facility),
    ]);
    return facility ?? null;
  }, { email });
}

export type NewUnverifiedFacilityInput = {
  name: string;
  type: Facility["type"];
  location: string;
};

/**
 * Create a facility row that is never verified. Callers cannot pass
 * verified/rating/openRoles — those stay at schema defaults.
 */
export async function createUnverifiedFacility(
  input: NewUnverifiedFacilityInput,
): Promise<Facility | null> {
  if (!hasDbConfig()) return null;
  const values: NewFacility = {
    name: input.name,
    type: input.type,
    location: input.location,
    verified: false,
    rating: "0",
    openRoles: 0,
    initials: facilityInitialsFromName(input.name),
    logoColor: DEFAULT_FACILITY_LOGO,
  };
  return withRepositoryLogging("facilities", "createUnverifiedFacility", async () => {
    const db = getDb();
    const rows = await db.insert(facilities).values(values).returning();
    return rows[0] ? toFacility(rows[0]) : null;
  }, { name: input.name });
}

export type FacilityProfilePatch = {
  name?: string;
  type?: Facility["type"];
  location?: string;
};

export async function updateFacilityPublicProfile(
  facilityId: string,
  patch: FacilityProfilePatch,
): Promise<Facility | null> {
  if (!hasDbConfig()) return null;
  const set: Partial<NewFacility> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (patch.name !== undefined) {
    set.name = patch.name;
    set.initials = facilityInitialsFromName(patch.name);
  }
  if (patch.type !== undefined) set.type = patch.type;
  if (patch.location !== undefined) set.location = patch.location;
  return withRepositoryLogging(
    "facilities",
    "updateFacilityPublicProfile",
    async () => {
      const db = getDb();
      const rows = await db
        .update(facilities)
        .set(set)
        .where(eq(facilities.id, facilityId))
        .returning();
      return rows[0] ? toFacility(rows[0]) : null;
    },
    { facilityId },
  );
}

export async function provisionFacilityUser(input: {
  userId: string;
  email: string;
  contactName: string;
  organisationName: string;
  location: string;
  facilityType: Facility["type"];
}): Promise<{ userId: string; facilityId: string; verified: boolean } | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("facilities", "provisionFacilityUser", async () => {
    const db = getDb();
    return db.transaction(async (tx) => {
      const userRows = await tx
        .insert(users)
        .values({
          id: input.userId,
          email: input.email,
          name: input.contactName,
          role: "facility",
          verified: false,
          location: input.location,
        })
        .returning({ id: users.id });
      const userId = userRows[0]?.id;
      if (!userId) return null;

      const facilityRows = await tx
        .insert(facilities)
        .values({
          name: input.organisationName,
          type: input.facilityType,
          location: input.location,
          verified: false,
          rating: "0",
          openRoles: 0,
          initials: facilityInitialsFromName(input.organisationName),
          logoColor: DEFAULT_FACILITY_LOGO,
        })
        .returning({ id: facilities.id, verified: facilities.verified });
      const facility = facilityRows[0];
      if (!facility) return null;

      await tx
        .update(users)
        .set({ facilityId: facility.id, updatedAt: new Date() })
        .where(eq(users.id, userId));

      return {
        userId,
        facilityId: facility.id,
        verified: facility.verified,
      };
    });
  }, { email: input.email });
}

export async function attachFacilityToExistingUser(input: {
  userId: string;
  organisationName: string;
  location: string;
  facilityType: Facility["type"];
}): Promise<{ facilityId: string; verified: boolean } | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "facilities",
    "attachFacilityToExistingUser",
    async () => {
      const db = getDb();
      return db.transaction(async (tx) => {
        const current = await tx
          .select({ facilityId: users.facilityId, role: users.role })
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);
        const row = current[0];
        if (!row || row.role !== "facility") return null;
        if (row.facilityId) {
          return { facilityId: row.facilityId, verified: false };
        }

        const facilityRows = await tx
          .insert(facilities)
          .values({
            name: input.organisationName,
            type: input.facilityType,
            location: input.location,
            verified: false,
            rating: "0",
            openRoles: 0,
            initials: facilityInitialsFromName(input.organisationName),
            logoColor: DEFAULT_FACILITY_LOGO,
          })
          .returning({ id: facilities.id, verified: facilities.verified });
        const facility = facilityRows[0];
        if (!facility) return null;

        await tx
          .update(users)
          .set({
            facilityId: facility.id,
            location: input.location,
            updatedAt: new Date(),
          })
          .where(eq(users.id, input.userId));

        return {
          facilityId: facility.id,
          verified: facility.verified,
        };
      });
    },
    { userId: input.userId },
  );
}
