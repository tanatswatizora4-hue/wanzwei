import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import type { FacilityInvitationStatus } from "@/lib/auth/facility-invitations";
import type { FacilityMembershipRole } from "@/lib/auth/workspace-model";
import { getDb, hasDbConfig } from "@/lib/db/client";
import { facilityInvitations } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";

export type FacilityInvitationRow = {
  id: string;
  facilityId: string;
  email: string;
  membershipRole: FacilityMembershipRole;
  tokenHash: string;
  status: FacilityInvitationStatus;
  invitedBy: string;
  expiresAt: Date;
  acceptedBy: string | null;
  acceptedAt: Date | null;
};

function toInvitation(row: typeof facilityInvitations.$inferSelect): FacilityInvitationRow {
  return {
    id: row.id,
    facilityId: row.facilityId,
    email: row.email,
    membershipRole: row.membershipRole as FacilityMembershipRole,
    tokenHash: row.tokenHash,
    status: row.status as FacilityInvitationStatus,
    invitedBy: row.invitedBy,
    expiresAt: row.expiresAt,
    acceptedBy: row.acceptedBy ?? null,
    acceptedAt: row.acceptedAt ?? null,
  };
}

export async function insertFacilityInvitation(input: {
  facilityId: string;
  email: string;
  membershipRole: FacilityMembershipRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
}): Promise<FacilityInvitationRow | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "facility_invitations",
    "insertFacilityInvitation",
    async () => {
      const db = getDb();
      const email = normalizeEmailAddress(input.email);
      await db
        .update(facilityInvitations)
        .set({ status: "revoked", updatedAt: sql`now()` })
        .where(
          and(
            eq(facilityInvitations.facilityId, input.facilityId),
            eq(facilityInvitations.email, email),
            eq(facilityInvitations.status, "pending"),
          ),
        );
      const rows = await db
        .insert(facilityInvitations)
        .values({
          facilityId: input.facilityId,
          email,
          membershipRole: input.membershipRole,
          tokenHash: input.tokenHash,
          status: "pending",
          invitedBy: input.invitedBy,
          expiresAt: input.expiresAt,
        })
        .returning();
      return rows[0] ? toInvitation(rows[0]) : null;
    },
    { facilityId: input.facilityId, invitedBy: input.invitedBy },
  );
}

export async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<FacilityInvitationRow | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "facility_invitations",
    "findInvitationByTokenHash",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(facilityInvitations)
        .where(eq(facilityInvitations.tokenHash, tokenHash))
        .limit(1);
      return rows[0] ? toInvitation(rows[0]) : null;
    },
    {},
  );
}

export async function listPendingInvitationsForFacility(
  facilityId: string,
): Promise<Omit<FacilityInvitationRow, "tokenHash">[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "facility_invitations",
    "listPendingInvitationsForFacility",
    async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(facilityInvitations)
        .where(
          and(
            eq(facilityInvitations.facilityId, facilityId),
            eq(facilityInvitations.status, "pending"),
          ),
        )
        .orderBy(desc(facilityInvitations.createdAt));
      return rows.map((row) => {
        const invitation = toInvitation(row);
        return {
          id: invitation.id,
          facilityId: invitation.facilityId,
          email: invitation.email,
          membershipRole: invitation.membershipRole,
          status: invitation.status,
          invitedBy: invitation.invitedBy,
          expiresAt: invitation.expiresAt,
          acceptedBy: invitation.acceptedBy,
          acceptedAt: invitation.acceptedAt,
        };
      });
    },
    { facilityId },
  );
}

export async function markInvitationAccepted(input: {
  id: string;
  acceptedBy: string;
}): Promise<boolean> {
  if (!hasDbConfig()) return false;
  return withRepositoryLogging(
    "facility_invitations",
    "markInvitationAccepted",
    async () => {
      const db = getDb();
      const rows = await db
        .update(facilityInvitations)
        .set({
          status: "accepted",
          acceptedBy: input.acceptedBy,
          acceptedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(facilityInvitations.id, input.id),
            eq(facilityInvitations.status, "pending"),
          ),
        )
        .returning({ id: facilityInvitations.id });
      return rows.length > 0;
    },
    { id: input.id },
  );
}

export async function revokeFacilityInvitation(input: {
  id: string;
  facilityId: string;
}): Promise<boolean> {
  if (!hasDbConfig()) return false;
  return withRepositoryLogging(
    "facility_invitations",
    "revokeFacilityInvitation",
    async () => {
      const db = getDb();
      const rows = await db
        .update(facilityInvitations)
        .set({ status: "revoked", updatedAt: sql`now()` })
        .where(
          and(
            eq(facilityInvitations.id, input.id),
            eq(facilityInvitations.facilityId, input.facilityId),
            eq(facilityInvitations.status, "pending"),
          ),
        )
        .returning({ id: facilityInvitations.id });
      return rows.length > 0;
    },
    input,
  );
}
