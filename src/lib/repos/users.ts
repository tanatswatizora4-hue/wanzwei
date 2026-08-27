import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { facilities, users } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbUser, NewDbUser } from "@/lib/db/schema";
import type { User } from "@/lib/types";

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
  return withRepositoryLogging("users", "findUserByEmail", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }, { email });
}

export async function listUsers(limit = 100): Promise<User[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("users", "listUsers", async () => {
    const db = getDb();
    const rows = await db.select().from(users).orderBy(asc(users.name)).limit(limit);
    return rows.map(toUser);
  }, { limit });
}

export type AdminUserRow = {
  user: User;
  facilityName: string | null;
  joinedAt: string;
};

export async function listUsersForAdmin(limit = 100): Promise<AdminUserRow[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("users", "listUsersForAdmin", async () => {
    const db = getDb();
    const rows = await db
      .select({ user: users, facility: facilities })
      .from(users)
      .leftJoin(facilities, eq(facilities.id, users.facilityId))
      .orderBy(asc(users.name))
      .limit(limit);
    return rows.map((row) => ({
      user: toUser(row.user),
      facilityName: row.facility?.name ?? null,
      joinedAt: row.user.createdAt.toISOString(),
    }));
  }, { limit });
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
  return withRepositoryLogging("users", "createUser", async () => {
    const db = getDb();
    const rows = await db.insert(users).values(user).returning();
    return rows[0] ? toUser(rows[0]) : null;
  }, { email: user.email, role: user.role });
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
