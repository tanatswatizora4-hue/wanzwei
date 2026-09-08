import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { accountMemberships, facilities } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type {
  AccountMembership,
  FacilityMembershipRole,
  MembershipProfileType,
  MembershipStatus,
} from "@/lib/auth/workspace-model";

export function toAccountMembership(row: {
  id: string;
  userId: string;
  profileType: MembershipProfileType;
  professionalProfileId: string | null;
  facilityId: string | null;
  membershipRole: FacilityMembershipRole;
  status: MembershipStatus;
  facilityName?: string | null;
}): AccountMembership {
  return {
    id: row.id,
    userId: row.userId,
    profileType: row.profileType,
    professionalProfileId: row.professionalProfileId,
    facilityId: row.facilityId,
    facilityName: row.facilityName,
    membershipRole: row.membershipRole,
    status: row.status,
  };
}

export async function listMembershipsForUser(
  userId: string,
): Promise<AccountMembership[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "account_memberships",
    "listMembershipsForUser",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          id: accountMemberships.id,
          userId: accountMemberships.userId,
          profileType: accountMemberships.profileType,
          professionalProfileId: accountMemberships.professionalProfileId,
          facilityId: accountMemberships.facilityId,
          membershipRole: accountMemberships.membershipRole,
          status: accountMemberships.status,
          facilityName: facilities.name,
        })
        .from(accountMemberships)
        .leftJoin(facilities, eq(facilities.id, accountMemberships.facilityId))
        .where(eq(accountMemberships.userId, userId));
      return rows.map((row) =>
        toAccountMembership({
          ...row,
          profileType: row.profileType as MembershipProfileType,
          membershipRole: row.membershipRole as FacilityMembershipRole,
          status: row.status as MembershipStatus,
        }),
      );
    },
    { userId },
  );
}

export async function insertProfessionalMembership(
  userId: string,
): Promise<AccountMembership | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "account_memberships",
    "insertProfessionalMembership",
    async () => {
      const existing = await listMembershipsForUser(userId);
      const current = existing.find(
        (membership) =>
          membership.profileType === "professional" && membership.status === "active",
      );
      if (current) return current;
      const db = getDb();
      const rows = await db
        .insert(accountMemberships)
        .values({
          userId,
          profileType: "professional",
          professionalProfileId: userId,
          facilityId: null,
          membershipRole: "owner",
          status: "active",
        })
        .returning();
      return rows[0] ? toAccountMembership(rows[0] as never) : null;
    },
    { userId },
  );
}

export async function insertFacilityMembership(input: {
  userId: string;
  facilityId: string;
  membershipRole?: FacilityMembershipRole;
}): Promise<AccountMembership | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "account_memberships",
    "insertFacilityMembership",
    async () => {
      const existing = await listMembershipsForUser(input.userId);
      const current = existing.find(
        (membership) =>
          membership.profileType === "facility" &&
          membership.facilityId === input.facilityId &&
          membership.status === "active",
      );
      if (current) return current;
      const db = getDb();
      const rows = await db
        .insert(accountMemberships)
        .values({
          userId: input.userId,
          profileType: "facility",
          professionalProfileId: null,
          facilityId: input.facilityId,
          membershipRole: input.membershipRole ?? "owner",
          status: "active",
        })
        .returning();
      return rows[0] ? toAccountMembership(rows[0] as never) : null;
    },
    input,
  );
}

export async function revokeFacilityMembership(input: {
  userId: string;
  facilityId: string;
}): Promise<boolean> {
  if (!hasDbConfig()) return false;
  return withRepositoryLogging(
    "account_memberships",
    "revokeFacilityMembership",
    async () => {
      const db = getDb();
      const rows = await db
        .update(accountMemberships)
        .set({ status: "revoked", updatedAt: sql`now()` })
        .where(
          and(
            eq(accountMemberships.userId, input.userId),
            eq(accountMemberships.facilityId, input.facilityId),
            eq(accountMemberships.profileType, "facility"),
            eq(accountMemberships.status, "active"),
          ),
        )
        .returning({ id: accountMemberships.id });
      return rows.length > 0;
    },
    input,
  );
}
