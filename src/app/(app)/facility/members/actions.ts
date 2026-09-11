"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import { canManageMembers } from "@/lib/auth/facility-capabilities";
import {
  evaluateInvitationAcceptance,
  generateFacilityInvitationToken,
  hashFacilityInvitationToken,
  invitationExpiresAt,
  isInviteableRole,
  wouldLeaveZeroOwners,
} from "@/lib/auth/facility-invitations";
import { requireUser } from "@/lib/auth/session";
import { persistWorkspacePreference } from "@/lib/auth/workspace";
import { sendEmail } from "@/lib/email/client";
import { facilityWorkspaceInvitationTemplate } from "@/lib/email/templates";
import { requireFacilityCapability } from "@/lib/facility-for-user";
import { facilityInvitationUrl, appOrigin } from "@/lib/http/app-origin";
import { hasDbConfig } from "@/lib/db/client";
import {
  countActiveFacilityOwners,
  insertFacilityMembership,
  listFacilityMembers,
  listMembershipsForUser,
  revokeFacilityMembership,
  updateFacilityMembershipRole,
} from "@/lib/repos/account-memberships";
import { getFacility } from "@/lib/repos/facilities";
import {
  findInvitationByTokenHash,
  insertFacilityInvitation,
  markInvitationAccepted,
  revokeFacilityInvitation,
} from "@/lib/repos/facility-invitations";
import { findUserByEmail } from "@/lib/repos/users";
import { ServerActionValidationError } from "@/lib/validation/errors";
import { z } from "zod";

export type InviteMemberResult =
  | { ok: true; inviteUrl: string; emailed: boolean }
  | { ok: false; error: string };

function inviteError(error: string): InviteMemberResult {
  return { ok: false, error };
}

const InviteMemberSchema = z.object({
  email: z.string().trim().min(1).max(254).email(),
  membershipRole: z.enum(["owner", "admin", "recruiter", "viewer"]),
});

const MemberTargetSchema = z.object({
  userId: z.string().uuid(),
});

const ChangeRoleSchema = z.object({
  userId: z.string().uuid(),
  membershipRole: z.enum(["owner", "admin", "recruiter", "viewer"]),
});

function revalidateMembers() {
  revalidatePath("/facility/members");
  revalidatePath("/facility/dashboard");
  revalidatePath("/facility/settings");
}

export async function inviteFacilityMemberAction(
  formData: FormData,
): Promise<InviteMemberResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return inviteError("Database is not configured.");
  const context = await requireFacilityCapability(user, "manageMembers");
  if (!context) {
    return inviteError("You cannot invite members for this facility.");
  }

  const parsed = InviteMemberSchema.safeParse({
    email: formData.get("email"),
    membershipRole: formData.get("membershipRole"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const email = normalizeEmailAddress(parsed.data.email);
  if (email === normalizeEmailAddress(user.email)) {
    return inviteError("You already belong to this facility.");
  }

  const existingMembers = await listFacilityMembers(context.facilityId);
  if (
    existingMembers.some(
      (member) => member.memberEmail && normalizeEmailAddress(member.memberEmail) === email,
    )
  ) {
    return inviteError("That person already has access to this facility.");
  }

  const token = generateFacilityInvitationToken();
  const invitation = await insertFacilityInvitation({
    facilityId: context.facilityId,
    email,
    membershipRole: parsed.data.membershipRole,
    tokenHash: hashFacilityInvitationToken(token),
    invitedBy: user.id,
    expiresAt: invitationExpiresAt(),
  });
  if (!invitation) {
    return inviteError("Could not create this invitation.");
  }

  const origin = await appOrigin();
  const inviteUrl = facilityInvitationUrl(origin, token);
  const facility = await getFacility(context.facilityId);
  const template = facilityWorkspaceInvitationTemplate({
    facilityName: facility?.name ?? "a facility",
    membershipRole: parsed.data.membershipRole,
    inviteUrl,
  });
  const emailed = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
  revalidateMembers();
  return {
    ok: true,
    inviteUrl,
    emailed: emailed.sent === true,
  };
}

export async function changeFacilityMemberRoleAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return actionError("Database is not configured.");
  const context = await requireFacilityCapability(user, "manageMembers");
  if (!context) {
    return actionError("You cannot change member roles.");
  }
  const parsed = ChangeRoleSchema.safeParse({
    userId: formData.get("userId"),
    membershipRole: formData.get("membershipRole"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }
  if (!isInviteableRole(parsed.data.membershipRole)) {
    return actionError("That role is not valid.");
  }

  const members = await listFacilityMembers(context.facilityId);
  const target = members.find((member) => member.userId === parsed.data.userId);
  if (!target) return actionError("That member was not found.");

  const ownerCount = await countActiveFacilityOwners(context.facilityId);
  if (
    parsed.data.membershipRole !== "owner" &&
    wouldLeaveZeroOwners({
      ownerCount,
      targetIsOwner: target.membershipRole === "owner",
    })
  ) {
    return actionError("Keep at least one owner on this facility.");
  }

  const updated = await updateFacilityMembershipRole({
    userId: parsed.data.userId,
    facilityId: context.facilityId,
    membershipRole: parsed.data.membershipRole,
  });
  if (!updated) return actionError("Could not update that member.");
  revalidateMembers();
  return actionOk();
}

export async function revokeFacilityMemberAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return actionError("Database is not configured.");
  const context = await requireFacilityCapability(user, "manageMembers");
  if (!context) {
    return actionError("You cannot remove members.");
  }
  const parsed = MemberTargetSchema.safeParse({
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }
  if (parsed.data.userId === user.id) {
    return actionError("Use Leave facility to remove yourself.");
  }
  const members = await listFacilityMembers(context.facilityId);
  const target = members.find((member) => member.userId === parsed.data.userId);
  if (!target) return actionError("That member was not found.");
  const ownerCount = await countActiveFacilityOwners(context.facilityId);
  if (
    wouldLeaveZeroOwners({
      ownerCount,
      targetIsOwner: target.membershipRole === "owner",
    })
  ) {
    return actionError("Keep at least one owner on this facility.");
  }
  const revoked = await revokeFacilityMembership({
    userId: parsed.data.userId,
    facilityId: context.facilityId,
  });
  if (!revoked) return actionError("Could not remove that member.");
  revalidateMembers();
  return actionOk();
}

export async function revokeFacilityInviteAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return actionError("Database is not configured.");
  const context = await requireFacilityCapability(user, "manageMembers");
  if (!context) {
    return actionError("You cannot revoke invitations.");
  }
  const id = String(formData.get("invitationId") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    return actionError("Invalid invitation.");
  }
  const revoked = await revokeFacilityInvitation({
    id,
    facilityId: context.facilityId,
  });
  if (!revoked) return actionError("Could not revoke that invitation.");
  revalidateMembers();
  return actionOk();
}

export async function leaveFacilityAction(): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return actionError("Database is not configured.");
  const context = await requireFacilityCapability(user, "viewFacility");
  if (!context) {
    return actionError("You are not in a facility workspace.");
  }
  if (!canManageMembers(context.membership.membershipRole)) {
    // any member can leave except last owner
  }
  const ownerCount = await countActiveFacilityOwners(context.facilityId);
  if (
    wouldLeaveZeroOwners({
      ownerCount,
      targetIsOwner: context.membership.membershipRole === "owner",
    })
  ) {
    return actionError(
      "Promote another owner before you leave this facility.",
    );
  }
  const revoked = await revokeFacilityMembership({
    userId: user.id,
    facilityId: context.facilityId,
  });
  if (!revoked) return actionError("Could not leave this facility.");

  const memberships = await listMembershipsForUser(user.id);
  const professional = memberships.find(
    (item) => item.profileType === "professional" && item.status === "active",
  );
  if (professional) {
    await persistWorkspacePreference({ type: "professional" });
    revalidateMembers();
    redirect("/professional/dashboard");
  }
  const remaining = memberships.find(
    (item) =>
      item.profileType === "facility" &&
      item.status === "active" &&
      item.facilityId &&
      item.facilityId !== context.facilityId,
  );
  if (remaining?.facilityId) {
    await persistWorkspacePreference({
      type: "facility",
      facilityId: remaining.facilityId,
    });
    revalidateMembers();
    redirect("/facility/dashboard");
  }
  revalidateMembers();
  redirect("/workspaces/add");
}

export async function acceptFacilityInvitationAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role === "admin") {
    return actionError("Admin accounts cannot join facility workspaces this way.");
  }
  if (!hasDbConfig()) return actionError("Database is not configured.");

  const token = extractInvitationToken(String(formData.get("token") ?? ""));
  if (token.length < 16) {
    return actionError("That invitation link is not valid.");
  }

  const invitation = await findInvitationByTokenHash(
    hashFacilityInvitationToken(token),
  );
  if (!invitation) {
    return actionError("That invitation was not found.");
  }

  const evaluation = evaluateInvitationAcceptance({
    invitation,
    actorEmail: user.email,
  });
  if (!evaluation.ok) {
    if (evaluation.reason === "wrong_email") {
      return actionError(
        "Sign in with the email address this invitation was sent to.",
      );
    }
    if (evaluation.reason === "already_accepted") {
      const existing = await findUserByEmail(user.email);
      if (existing) {
        await persistWorkspacePreference({
          type: "facility",
          facilityId: invitation.facilityId,
        });
        redirect("/facility/dashboard");
      }
    }
    return actionError("That invitation can no longer be used.");
  }

  const membership = await insertFacilityMembership({
    userId: user.id,
    facilityId: invitation.facilityId,
    membershipRole: invitation.membershipRole,
  });
  if (!membership) {
    return actionError("Could not join this facility.");
  }
  await markInvitationAccepted({
    id: invitation.id,
    acceptedBy: user.id,
  });
  await persistWorkspacePreference({
    type: "facility",
    facilityId: invitation.facilityId,
  });
  revalidateMembers();
  redirect("/facility/dashboard");
}

function extractInvitationToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.searchParams.get("token")?.trim() || trimmed;
  } catch {
    const match = /[?&]token=([^&]+)/.exec(trimmed);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
    return trimmed;
  }
}
