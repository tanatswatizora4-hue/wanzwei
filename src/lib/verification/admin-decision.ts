import "server-only";

import { getDb, hasDbConfig } from "@/lib/db/client";
import { toVerification } from "@/lib/repos/verifications";
import type { User, Verification, VerificationMatchOutcome, VerificationStatus } from "@/lib/types";
import {
  createDrizzleWriteTx,
  type VerificationWriteTx,
} from "@/lib/verification/submit";

export type AdminDecisionResult = {
  verification: Verification;
  userVerified: boolean;
};

export type AdminDecisionStore = {
  hasDbConfig: () => boolean;
  runInTransaction: <T>(fn: (tx: VerificationWriteTx) => Promise<T>) => Promise<T>;
};

const defaultStore: AdminDecisionStore = {
  hasDbConfig,
  runInTransaction: async (fn) => {
    const db = getDb();
    return db.transaction((tx) =>
      fn(createDrizzleWriteTx(tx as ReturnType<typeof getDb>)),
    );
  },
};

export async function applyAdminVerificationDecision(
  admin: User,
  verificationId: string,
  status: Extract<VerificationStatus, "Verified" | "Rejected">,
  store: AdminDecisionStore = defaultStore,
): Promise<AdminDecisionResult | null> {
  if (!store.hasDbConfig()) return null;

  return store.runInTransaction(async (tx) => {
    const current = await tx.getById(verificationId);
    if (!current) return null;

    if (current.status === status) {
      let userVerified = false;
      if (status === "Verified") {
        await tx.setUserVerified(current.userId, true);
        userVerified = true;
      } else {
        const otherVerified = await tx.countOtherVerifiedCases(
          current.userId,
          current.id,
        );
        userVerified = otherVerified > 0;
      }
      return {
        verification: toVerification({
          ...current,
          createdAt: current.createdAt,
          updatedAt: current.submittedAt,
        }),
        userVerified,
      };
    }

    const fromStatus = current.status;
    const matchOutcome = toOutcome(current.matchOutcome);

    const saved = await tx.updateCase(current.id, {
      name: current.name,
      profession: current.profession,
      registeringBody: current.registeringBody ?? "",
      registrationNumber: current.registrationNumber ?? "",
      status,
      matchOutcome,
      matchedRegistryId: current.matchedRegistryId,
    });

    let userVerified = false;
    if (status === "Verified") {
      await tx.setUserVerified(current.userId, true);
      userVerified = true;
    } else {
      const otherVerified = await tx.countOtherVerifiedCases(
        current.userId,
        current.id,
      );
      if (otherVerified === 0) {
        await tx.setUserVerified(current.userId, false);
        userVerified = false;
      } else {
        userVerified = true;
      }
    }

    await tx.insertEvent({
      verificationId: saved.id,
      actorUserId: admin.id,
      fromStatus,
      toStatus: status,
      method: "admin",
      matchRegistryId: saved.matchedRegistryId,
      reason: `Admin ${status}`,
    });

    return {
      verification: toVerification({
        ...saved,
        createdAt: saved.createdAt,
        updatedAt: saved.submittedAt,
      }),
      userVerified,
    };
  });
}

function toOutcome(value: string | null): VerificationMatchOutcome {
  const allowed: VerificationMatchOutcome[] = [
    "matched",
    "not_found",
    "expired",
    "ambiguous",
    "profession_mismatch",
    "name_mismatch",
    "missing_registration_number",
    "registry_lookup_failed",
    "non_clinical_qualification",
  ];
  return allowed.find((outcome) => outcome === value) ?? "not_found";
}
