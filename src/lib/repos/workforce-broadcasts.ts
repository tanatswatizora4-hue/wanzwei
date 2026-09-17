import "server-only";

import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import {
  accountMemberships,
  facilities,
  users,
  workforceBroadcastRecipients,
  workforceBroadcasts,
} from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import { parseStoredTargetingCriteria } from "@/lib/broadcasts/criteria";
import type {
  BroadcastMatchCandidate,
  BroadcastRecipientStatus,
  BroadcastStatus,
  BroadcastType,
  TargetingCriteria,
  WorkforceBroadcastRecord,
} from "@/lib/broadcasts/network-types";
import { isBroadcastType } from "@/lib/broadcasts/network-types";
import type { NewDbWorkforceBroadcast } from "@/lib/db/schema";

function toBroadcast(
  row: typeof workforceBroadcasts.$inferSelect,
  facilityName?: string | null,
): WorkforceBroadcastRecord | null {
  if (!isBroadcastType(row.type)) return null;
  const status = row.status as BroadcastStatus;
  if (status !== "draft" && status !== "sent" && status !== "cancelled") {
    return null;
  }
  return {
    id: row.id,
    facilityId: row.facilityId,
    createdBy: row.createdBy,
    type: row.type,
    title: row.title,
    message: row.message,
    location: row.location,
    positionsNeeded: row.positionsNeeded,
    shiftStart: row.shiftStart?.toISOString() ?? null,
    shiftEnd: row.shiftEnd?.toISOString() ?? null,
    status,
    targetingCriteria: parseStoredTargetingCriteria(row.targetingCriteria),
    matchedRecipientCount: row.matchedRecipientCount,
    jobId: row.jobId,
    emergencyAlertId: row.emergencyAlertId,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    facilityName: facilityName ?? null,
  };
}

export async function listProfessionalsForBroadcastMatch(): Promise<
  BroadcastMatchCandidate[]
> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "workforce-broadcasts",
    "listProfessionalsForBroadcastMatch",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          id: users.id,
          role: users.role,
          verified: users.verified,
          profession: users.profession,
          location: users.location,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .leftJoin(
          accountMemberships,
          and(
            eq(accountMemberships.userId, users.id),
            eq(accountMemberships.profileType, "professional"),
            eq(accountMemberships.status, "active"),
          ),
        )
        .where(
          and(
            isNull(users.deletedAt),
            or(
              eq(users.role, "professional"),
              eq(accountMemberships.profileType, "professional"),
            ),
          ),
        );
      const byId = new Map<string, BroadcastMatchCandidate>();
      for (const row of rows) {
        if (row.role === "admin") continue;
        byId.set(row.id, row);
      }
      return [...byId.values()];
    },
  );
}

export async function insertWorkforceBroadcast(input: {
  facilityId: string;
  createdBy: string;
  type: BroadcastType;
  title: string;
  message: string;
  location?: string;
  positionsNeeded?: number;
  shiftStart?: Date;
  shiftEnd?: Date;
  status?: BroadcastStatus;
  targetingCriteria: TargetingCriteria;
  matchedRecipientCount: number;
  jobId?: string;
  emergencyAlertId?: string;
  sentAt?: Date;
}): Promise<WorkforceBroadcastRecord | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "workforce-broadcasts",
    "insertWorkforceBroadcast",
    async () => {
      const values: NewDbWorkforceBroadcast = {
        facilityId: input.facilityId,
        createdBy: input.createdBy,
        type: input.type,
        title: input.title,
        message: input.message,
        location: input.location,
        positionsNeeded: input.positionsNeeded,
        shiftStart: input.shiftStart,
        shiftEnd: input.shiftEnd,
        status: input.status ?? "sent",
        targetingCriteria: input.targetingCriteria,
        matchedRecipientCount: input.matchedRecipientCount,
        jobId: input.jobId,
        emergencyAlertId: input.emergencyAlertId,
        sentAt: input.sentAt ?? new Date(),
      };
      const db = getDb();
      const rows = await db.insert(workforceBroadcasts).values(values).returning();
      return rows[0] ? toBroadcast(rows[0]) : null;
    },
    { facilityId: input.facilityId, type: input.type },
  );
}

export async function insertBroadcastRecipients(input: {
  broadcastId: string;
  professionalUserIds: string[];
  status?: BroadcastRecipientStatus;
}): Promise<number> {
  if (!hasDbConfig() || input.professionalUserIds.length === 0) return 0;
  return withRepositoryLogging(
    "workforce-broadcasts",
    "insertBroadcastRecipients",
    async () => {
      const db = getDb();
      const rows = await db
        .insert(workforceBroadcastRecipients)
        .values(
          input.professionalUserIds.map((professionalUserId) => ({
            broadcastId: input.broadcastId,
            professionalUserId,
            status: input.status ?? "notified",
          })),
        )
        .returning({ id: workforceBroadcastRecipients.id });
      return rows.length;
    },
    { broadcastId: input.broadcastId, count: input.professionalUserIds.length },
  );
}

export async function listBroadcastsForFacility(
  facilityId: string,
  limit = 50,
): Promise<WorkforceBroadcastRecord[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "workforce-broadcasts",
    "listBroadcastsForFacility",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(workforceBroadcasts)
        .where(eq(workforceBroadcasts.facilityId, facilityId))
        .orderBy(desc(workforceBroadcasts.createdAt))
        .limit(limit);
      return rows
        .map((row) => toBroadcast(row))
        .filter((row): row is WorkforceBroadcastRecord => row != null);
    },
    { facilityId, limit },
  );
}

export async function getBroadcastForFacility(input: {
  broadcastId: string;
  facilityId: string;
}): Promise<WorkforceBroadcastRecord | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "workforce-broadcasts",
    "getBroadcastForFacility",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(workforceBroadcasts)
        .where(
          and(
            eq(workforceBroadcasts.id, input.broadcastId),
            eq(workforceBroadcasts.facilityId, input.facilityId),
          ),
        )
        .limit(1);
      return rows[0] ? toBroadcast(rows[0]) : null;
    },
    input,
  );
}

export async function listBroadcastsForProfessional(
  professionalUserId: string,
  limit = 50,
): Promise<WorkforceBroadcastRecord[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "workforce-broadcasts",
    "listBroadcastsForProfessional",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          broadcast: workforceBroadcasts,
          facilityName: facilities.name,
        })
        .from(workforceBroadcasts)
        .innerJoin(
          workforceBroadcastRecipients,
          eq(workforceBroadcastRecipients.broadcastId, workforceBroadcasts.id),
        )
        .innerJoin(facilities, eq(facilities.id, workforceBroadcasts.facilityId))
        .where(
          and(
            eq(workforceBroadcastRecipients.professionalUserId, professionalUserId),
            eq(workforceBroadcasts.status, "sent"),
          ),
        )
        .orderBy(desc(workforceBroadcasts.sentAt), desc(workforceBroadcasts.createdAt))
        .limit(limit);
      return rows
        .map((row) => toBroadcast(row.broadcast, row.facilityName))
        .filter((row): row is WorkforceBroadcastRecord => row != null);
    },
    { professionalUserId, limit },
  );
}

export async function getBroadcastForProfessionalRecipient(input: {
  broadcastId: string;
  professionalUserId: string;
}): Promise<WorkforceBroadcastRecord | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "workforce-broadcasts",
    "getBroadcastForProfessionalRecipient",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          broadcast: workforceBroadcasts,
          facilityName: facilities.name,
          recipientId: workforceBroadcastRecipients.id,
        })
        .from(workforceBroadcasts)
        .innerJoin(
          workforceBroadcastRecipients,
          eq(workforceBroadcastRecipients.broadcastId, workforceBroadcasts.id),
        )
        .innerJoin(facilities, eq(facilities.id, workforceBroadcasts.facilityId))
        .where(
          and(
            eq(workforceBroadcasts.id, input.broadcastId),
            eq(workforceBroadcastRecipients.professionalUserId, input.professionalUserId),
            eq(workforceBroadcasts.status, "sent"),
          ),
        )
        .limit(1);
      if (!rows[0]) return null;
      return toBroadcast(rows[0].broadcast, rows[0].facilityName);
    },
    input,
  );
}

export async function loadUsersByIds(ids: string[]): Promise<BroadcastMatchCandidate[]> {
  if (!hasDbConfig() || ids.length === 0) return [];
  return withRepositoryLogging(
    "workforce-broadcasts",
    "loadUsersByIds",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          id: users.id,
          role: users.role,
          verified: users.verified,
          profession: users.profession,
          location: users.location,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(and(inArray(users.id, ids), isNull(users.deletedAt)));
      return rows;
    },
    { count: ids.length },
  );
}
