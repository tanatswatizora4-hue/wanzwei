import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { notifications, users } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { DbNotification, NewDbNotification } from "@/lib/db/schema";
import type { Notification } from "@/lib/types";

export function toNotification(row: DbNotification): Notification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    unread: row.unread,
    kind: row.kind,
  };
}

export async function countUnreadNotificationsForUser(
  userId: string,
): Promise<number> {
  if (!hasDbConfig()) return 0;
  return withRepositoryLogging(
    "notifications",
    "countUnreadNotificationsForUser",
    async () => {
      const db = getDb();
      const rows = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), eq(notifications.unread, true)),
        );
      return Number(rows[0]?.count ?? 0);
    },
    { userId },
  );
}

export async function getNotificationsForUser(
  userId: string,
  limit = 50,
): Promise<Notification[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "notifications",
    "getNotificationsForUser",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return rows.map(toNotification);
    },
    { userId, limit },
  );
}

export async function getNotificationsForUserEmail(
  email: string,
  limit = 50,
): Promise<Notification[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "notifications",
    "getNotificationsForUserEmail",
    async () => {
      const db = getDb();
      const rows = await db
        .select({ notification: notifications })
        .from(notifications)
        .innerJoin(users, eq(users.id, notifications.userId))
        .where(eq(users.email, email))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return rows.map((row) => toNotification(row.notification));
    },
    { email, limit },
  );
}

export async function createNotification(
  notification: NewDbNotification,
): Promise<Notification | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("notifications", "createNotification", async () => {
    const db = getDb();
    const rows = await db.insert(notifications).values(notification).returning();
    return rows[0] ? toNotification(rows[0]) : null;
  }, { userId: notification.userId });
}

export async function markNotificationRead(
  id: string,
): Promise<Notification | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging("notifications", "markNotificationRead", async () => {
    const db = getDb();
    const rows = await db
      .update(notifications)
      .set({ unread: false })
      .where(eq(notifications.id, id))
      .returning();
    return rows[0] ? toNotification(rows[0]) : null;
  }, { id });
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  if (!hasDbConfig()) return 0;
  return withRepositoryLogging(
    "notifications",
    "markAllNotificationsRead",
    async () => {
      const db = getDb();
      const rows = await db
        .update(notifications)
        .set({ unread: false })
        .where(eq(notifications.userId, userId))
        .returning({ id: notifications.id });
      return rows.length;
    },
    { userId },
  );
}
