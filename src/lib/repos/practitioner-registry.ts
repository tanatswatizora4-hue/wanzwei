import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { practitionerRegistry } from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type { RegistryMatchRecord } from "@/lib/registry/match";
import { normalizeRegisteringBody } from "@/lib/registry/match";
import { normalizeRegistrationNumber } from "@/lib/registry/persons-register";

export type RegistryLookupExecutor = {
  lookupByRegistration: (
    registeringBody: string,
    registrationNumber: string,
  ) => Promise<RegistryMatchRecord[]>;
};

function mapRow(row: {
  id: string;
  registeringBody: string;
  registrationNumberNormalized: string;
  fullNameNormalized: string;
  qualification: string;
  qualificationNormalized: string;
  expiryDate: string;
  isPlaceholder: boolean;
  licenceClass: string;
  licenceSerial: string;
}): RegistryMatchRecord {
  return {
    id: row.id,
    registeringBody: row.registeringBody,
    registrationNumberNormalized: row.registrationNumberNormalized,
    fullNameNormalized: row.fullNameNormalized,
    qualification: row.qualification,
    qualificationNormalized: row.qualificationNormalized,
    expiryDate: row.expiryDate,
    isPlaceholder: row.isPlaceholder,
    licenceClass: row.licenceClass,
    licenceSerial: row.licenceSerial,
  };
}

export async function findRegistryByRegistration(
  registeringBody: string,
  registrationNumber: string,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<RegistryMatchRecord[]> {
  if (!hasDbConfig()) return [];
  const body = normalizeRegisteringBody(registeringBody);
  const normalized = normalizeRegistrationNumber(registrationNumber);
  return withRepositoryLogging(
    "practitioner-registry",
    "findRegistryByRegistration",
    async () => {
      const rows = await db
        .select({
          id: practitionerRegistry.id,
          registeringBody: practitionerRegistry.registeringBody,
          registrationNumberNormalized:
            practitionerRegistry.registrationNumberNormalized,
          fullNameNormalized: practitionerRegistry.fullNameNormalized,
          qualification: practitionerRegistry.qualification,
          qualificationNormalized: practitionerRegistry.qualificationNormalized,
          expiryDate: practitionerRegistry.expiryDate,
          isPlaceholder: practitionerRegistry.isPlaceholder,
          licenceClass: practitionerRegistry.licenceClass,
          licenceSerial: practitionerRegistry.licenceSerial,
        })
        .from(practitionerRegistry)
        .where(
          and(
            eq(practitionerRegistry.registeringBody, body),
            eq(practitionerRegistry.registrationNumberNormalized, normalized),
          ),
        );
      return rows.map(mapRow);
    },
    { registeringBody: body },
  );
}
