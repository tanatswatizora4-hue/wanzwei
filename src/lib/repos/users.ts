import "server-only";

import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import { getDb, hasDbConfig } from "@/lib/db/client";
import { facilities, users } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbUser, NewDbUser } from "@/lib/db/schema";
import type { User, Role } from "@/lib/types";

export function toUser(row: DbUser): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    avatar: row.avatarUrl ?? undefined,
    title: row.title ?? undefined,
    location: row.location ?? undefined,
    verified: row.verified,
    facilityId: row.facilityId ?? undefined,
    profession: row.profession ?? undefined,
    registeringBody: row.registeringBody ?? undefined,
    registrationNumber: row.registrationNumber ?? undefined,
    cpdCredits: row.cpdCredits == null ? undefined : Number(row.cpdCredits),
    cpdTarget: row.cpdTarget == null ? undefined : Number(row.cpdTarget),
  };
}

/**
 * Look up a row in `public.users` by email.
 *
 * Used as the bridge between Supabase Auth (which identifies users by
 * UUID in `auth.users`) and our app tables (which reference users by
 * `public.users.id`). New email/OAuth signups write `public.users.id` =
 * Auth user id; reads still go by email until an `auth.users` FK lands.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  if (!hasDbConfig()) return null;
  const normalized = normalizeEmailAddress(email);
  return withRepositoryLogging("users", "findUserByEmail", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${normalized}`,
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }, { email: normalized });
}

export async function listUsers(limit = 100): Promise<User[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("users", "listUsers", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(asc(users.name))
      .limit(limit);
    return rows.map(toUser);
  }, { limit });
}

export type AdminUserRow = {
  user: User;
  facilityName: string | null;
  joinedAt: string;
};

export async function listUsersForAdmin(
  limit = 100,
  filters?: { q?: string; role?: Role },
): Promise<AdminUserRow[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("users", "listUsersForAdmin", async () => {
    const db = getDb();
    const clauses = [isNull(users.deletedAt)];
    if (filters?.role) {
      clauses.push(eq(users.role, filters.role));
    }
    if (filters?.q?.trim()) {
      const pattern = `%${filters.q.trim().replace(/[%_\\]/g, " ")}%`;
      clauses.push(
        or(ilike(users.name, pattern), ilike(users.email, pattern))!,
      );
    }
    const rows = await db
      .select({ user: users, facility: facilities })
      .from(users)
      .leftJoin(facilities, eq(facilities.id, users.facilityId))
      .where(and(...clauses))
      .orderBy(asc(users.name))
      .limit(limit);
    return rows.map((row) => ({
      user: toUser(row.user),
      facilityName: row.facility?.name ?? null,
      joinedAt: row.user.createdAt.toISOString(),
    }));
  }, { limit, q: filters?.q, role: filters?.role });
}

export async function findUserById(id: string): Promise<User | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("users", "findUserById", async () => {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }, { id });
}

export async function createUser(user: NewDbUser): Promise<User | null> {
  if (!hasDbConfig()) return null;
  const normalized = {
    ...user,
    email: normalizeEmailAddress(user.email),
  };
  return withRepositoryLogging("users", "createUser", async () => {
    const db = getDb();
    const rows = await db.insert(users).values(normalized).returning();
    return rows[0] ? toUser(rows[0]) : null;
  }, { email: normalized.email, role: user.role });
}

export async function updateUser(
  id: string,
  patch: Partial<NewDbUser>,
): Promise<User | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("users", "updateUser", async () => {
    const db = getDb();
    const rows = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return rows[0] ? toUser(rows[0]) : null;
  }, { id });
}

/** Settings-safe user patch. Never writes role, verified, facilityId, or HPA fields. */
export async function updateOwnUserProfile(
  userId: string,
  patch: { name: string; location?: string | null },
): Promise<User | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("users", "updateOwnUserProfile", async () => {
    const db = getDb();
    const rows = await db
      .update(users)
      .set({
        name: patch.name,
        location: patch.location ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return rows[0] ? toUser(rows[0]) : null;
  }, { id: userId });
}

export async function isClosedAccount(userId: string): Promise<boolean> {
  if (!hasDbConfig()) return false;
  return withRepositoryLogging("users", "isClosedAccount", async () => {
    const db = getDb();
    const rows = await db
      .select({ deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0]?.deletedAt != null;
  }, { id: userId });
}

export const DELETED_ACCOUNT_DISPLAY_NAME = "Deleted account";

export function anonymizedAccountEmail(userId: string): string {
  return `deleted+${userId.replace(/-/g, "")}@deleted.invalid`;
}

/**
 * Soft-delete and anonymize the caller's profile row. Verification,
 * application, and other audit/operational rows are left in place.
 * Never accepts a different user id than the authenticated actor.
 */
export async function anonymizeOwnUserForDeletion(
  userId: string,
): Promise<boolean> {
  if (!hasDbConfig()) return false;
  return withRepositoryLogging("users", "anonymizeOwnUserForDeletion", async () => {
    const db = getDb();
    const now = new Date();
    const rows = await db
      .update(users)
      .set({
        email: anonymizedAccountEmail(userId),
        name: DELETED_ACCOUNT_DISPLAY_NAME,
        title: null,
        location: null,
        avatarUrl: null,
        verified: false,
        profession: null,
        registeringBody: null,
        registrationNumber: null,
        facilityId: null,
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({ id: users.id });
    return rows.length === 1;
  }, { id: userId });
}
