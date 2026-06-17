import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import type { User } from "@/lib/types";

/** Resolve the persisted facility scope for an authenticated facility user. */
export async function resolveFacilityIdForUser(user: User): Promise<string | null> {
  if (user.role !== "facility") return null;
  if (user.facilityId) return user.facilityId;
  const facility = await findFacilityForUserEmail(user.email);
  return facility?.id ?? null;
}
