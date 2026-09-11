import { createHash, randomBytes } from "node:crypto";

import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import type { FacilityMembershipRole } from "@/lib/auth/workspace-model";

export const FACILITY_INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type FacilityInvitationStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export type InvitationAcceptanceFailure =
  | "wrong_email"
  | "expired"
  | "revoked"
  | "already_accepted"
  | "not_pending";

export function hashFacilityInvitationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateFacilityInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function invitationExpiresAt(
  now: Date = new Date(),
  ttlMs: number = FACILITY_INVITATION_TTL_MS,
): Date {
  return new Date(now.getTime() + ttlMs);
}

export function evaluateInvitationAcceptance(input: {
  invitation: {
    status: FacilityInvitationStatus;
    email: string;
    expiresAt: Date | string;
  };
  actorEmail: string;
  now?: Date;
}): { ok: true } | { ok: false; reason: InvitationAcceptanceFailure } {
  const now = input.now ?? new Date();
  const expiresAt = new Date(input.invitation.expiresAt);
  const invited = normalizeEmailAddress(input.invitation.email);
  const actor = normalizeEmailAddress(input.actorEmail);

  if (invited !== actor) return { ok: false, reason: "wrong_email" };
  if (input.invitation.status === "revoked") {
    return { ok: false, reason: "revoked" };
  }
  if (input.invitation.status === "accepted") {
    return { ok: false, reason: "already_accepted" };
  }
  if (input.invitation.status === "expired") {
    return { ok: false, reason: "expired" };
  }
  if (input.invitation.status !== "pending") {
    return { ok: false, reason: "not_pending" };
  }
  if (!(expiresAt.getTime() > now.getTime())) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

export function wouldLeaveZeroOwners(input: {
  ownerCount: number;
  targetIsOwner: boolean;
}): boolean {
  return input.targetIsOwner && input.ownerCount <= 1;
}

export function isInviteableRole(
  role: string,
): role is FacilityMembershipRole {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "recruiter" ||
    role === "viewer"
  );
}
