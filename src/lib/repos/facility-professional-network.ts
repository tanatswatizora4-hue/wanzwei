import "server-only";

import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import {
  accountMemberships,
  facilityProfessionalNetwork,
  users,
} from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import type {
  FacilityNetworkMember,
  NetworkRelationshipType,
  NetworkStatus,
} from "@/lib/broadcasts/network-types";
import { isNetworkRelationshipType } from "@/lib/broadcasts/network-types";

function toNetworkMember(row: {
  id: string;
  facilityId: string;
  professionalUserId: string;
  relationshipType: string;
  status: string;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  profession: string | null;
  location: string | null;
  verified: boolean;
}): FacilityNetworkMember | null {
  if (!isNetworkRelationshipType(row.relationshipType)) return null;
  if (
    row.status !== "active" &&
    row.status !== "inactive" &&
    row.status !== "invited"
  ) {
    return null;
  }
  return {
    id: row.id,
    facilityId: row.facilityId,
    professionalUserId: row.professionalUserId,
    name: row.name,
    email: row.email,
    profession: row.profession,
    location: row.location,
    verified: row.verified,
    relationshipType: row.relationshipType,
    status: row.status,
    addedBy: row.addedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listFacilityProfessionalNetwork(
  facilityId: string,
  search?: string,
): Promise<FacilityNetworkMember[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "facility-professional-network",
    "listFacilityProfessionalNetwork",
    async () => {
      const db = getDb();
      const clauses = [
        eq(facilityProfessionalNetwork.facilityId, facilityId),
        isNull(users.deletedAt),
      ];
      if (search?.trim()) {
        const pattern = `%${search.trim().replace(/[%_\\]/g, " ")}%`;
        clauses.push(
          or(
            ilike(users.name, pattern),
            ilike(users.email, pattern),
            ilike(users.profession, pattern),
          )!,
        );
      }
      const rows = await db
        .select({
          id: facilityProfessionalNetwork.id,
          facilityId: facilityProfessionalNetwork.facilityId,
          professionalUserId: facilityProfessionalNetwork.professionalUserId,
          relationshipType: facilityProfessionalNetwork.relationshipType,
          status: facilityProfessionalNetwork.status,
          addedBy: facilityProfessionalNetwork.addedBy,
          createdAt: facilityProfessionalNetwork.createdAt,
          updatedAt: facilityProfessionalNetwork.updatedAt,
          name: users.name,
          email: users.email,
          profession: users.profession,
          location: users.location,
          verified: users.verified,
        })
        .from(facilityProfessionalNetwork)
        .innerJoin(users, eq(users.id, facilityProfessionalNetwork.professionalUserId))
        .where(and(...clauses))
        .orderBy(asc(users.name));
      return rows
        .map(toNetworkMember)
        .filter((row): row is FacilityNetworkMember => row != null);
    },
    { facilityId, search },
  );
}

export async function listActiveNetworkMemberships(facilityId: string) {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "facility-professional-network",
    "listActiveNetworkMemberships",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          professionalUserId: facilityProfessionalNetwork.professionalUserId,
          relationshipType: facilityProfessionalNetwork.relationshipType,
          status: facilityProfessionalNetwork.status,
        })
        .from(facilityProfessionalNetwork)
        .where(eq(facilityProfessionalNetwork.facilityId, facilityId));
      return rows.filter(
        (row): row is {
          professionalUserId: string;
          relationshipType: NetworkRelationshipType;
          status: NetworkStatus;
        } =>
          isNetworkRelationshipType(row.relationshipType) &&
          (row.status === "active" ||
            row.status === "inactive" ||
            row.status === "invited"),
      );
    },
    { facilityId },
  );
}

export async function findNetworkMemberForFacility(input: {
  facilityId: string;
  professionalUserId: string;
}): Promise<FacilityNetworkMember | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "facility-professional-network",
    "findNetworkMemberForFacility",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          id: facilityProfessionalNetwork.id,
          facilityId: facilityProfessionalNetwork.facilityId,
          professionalUserId: facilityProfessionalNetwork.professionalUserId,
          relationshipType: facilityProfessionalNetwork.relationshipType,
          status: facilityProfessionalNetwork.status,
          addedBy: facilityProfessionalNetwork.addedBy,
          createdAt: facilityProfessionalNetwork.createdAt,
          updatedAt: facilityProfessionalNetwork.updatedAt,
          name: users.name,
          email: users.email,
          profession: users.profession,
          location: users.location,
          verified: users.verified,
        })
        .from(facilityProfessionalNetwork)
        .innerJoin(users, eq(users.id, facilityProfessionalNetwork.professionalUserId))
        .where(
          and(
            eq(facilityProfessionalNetwork.facilityId, input.facilityId),
            eq(
              facilityProfessionalNetwork.professionalUserId,
              input.professionalUserId,
            ),
          ),
        )
        .limit(1);
      return rows[0] ? toNetworkMember(rows[0]) : null;
    },
    input,
  );
}

export async function addFacilityNetworkMember(input: {
  facilityId: string;
  professionalUserId: string;
  relationshipType: NetworkRelationshipType;
  addedBy: string;
}): Promise<FacilityNetworkMember | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "facility-professional-network",
    "addFacilityNetworkMember",
    async () => {
      const db = getDb();
      const rows = await db
        .insert(facilityProfessionalNetwork)
        .values({
          facilityId: input.facilityId,
          professionalUserId: input.professionalUserId,
          relationshipType: input.relationshipType,
          status: "active",
          addedBy: input.addedBy,
        })
        .returning();
      const created = rows[0];
      if (!created) return null;
      return findNetworkMemberForFacility({
        facilityId: created.facilityId,
        professionalUserId: created.professionalUserId,
      });
    },
    { facilityId: input.facilityId, professionalUserId: input.professionalUserId },
  );
}

export async function updateFacilityNetworkMember(input: {
  facilityId: string;
  professionalUserId: string;
  relationshipType?: NetworkRelationshipType;
  status?: NetworkStatus;
}): Promise<FacilityNetworkMember | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "facility-professional-network",
    "updateFacilityNetworkMember",
    async () => {
      const patch: {
        relationshipType?: NetworkRelationshipType;
        status?: NetworkStatus;
        updatedAt: Date;
      } = { updatedAt: new Date() };
      if (input.relationshipType) patch.relationshipType = input.relationshipType;
      if (input.status) patch.status = input.status;
      const db = getDb();
      const rows = await db
        .update(facilityProfessionalNetwork)
        .set(patch)
        .where(
          and(
            eq(facilityProfessionalNetwork.facilityId, input.facilityId),
            eq(
              facilityProfessionalNetwork.professionalUserId,
              input.professionalUserId,
            ),
          ),
        )
        .returning({ professionalUserId: facilityProfessionalNetwork.professionalUserId });
      if (!rows[0]) return null;
      return findNetworkMemberForFacility({
        facilityId: input.facilityId,
        professionalUserId: input.professionalUserId,
      });
    },
    { facilityId: input.facilityId, professionalUserId: input.professionalUserId },
  );
}

export async function removeFacilityNetworkMember(input: {
  facilityId: string;
  professionalUserId: string;
}): Promise<boolean> {
  if (!hasDbConfig()) return false;
  return withRepositoryLogging(
    "facility-professional-network",
    "removeFacilityNetworkMember",
    async () => {
      const db = getDb();
      const rows = await db
        .delete(facilityProfessionalNetwork)
        .where(
          and(
            eq(facilityProfessionalNetwork.facilityId, input.facilityId),
            eq(
              facilityProfessionalNetwork.professionalUserId,
              input.professionalUserId,
            ),
          ),
        )
        .returning({ id: facilityProfessionalNetwork.id });
      return rows.length > 0;
    },
    input,
  );
}

export async function findProfessionalIdentityByEmail(email: string): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
} | null> {
  if (!hasDbConfig()) return null;
  const normalized = normalizeEmailAddress(email);
  return withRepositoryLogging(
    "facility-professional-network",
    "findProfessionalIdentityByEmail",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(sql`lower(${users.email}) = ${normalized}`)
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      if (row.role === "admin") return null;
      if (row.role === "professional") return row;
      const memberships = await db
        .select({ id: accountMemberships.id })
        .from(accountMemberships)
        .where(
          and(
            eq(accountMemberships.userId, row.id),
            eq(accountMemberships.profileType, "professional"),
            eq(accountMemberships.status, "active"),
          ),
        )
        .limit(1);
      return memberships[0] ? row : null;
    },
    { email: normalized },
  );
}
