"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  changeFacilityMemberRoleAction,
  inviteFacilityMemberAction,
  leaveFacilityAction,
  revokeFacilityInviteAction,
  revokeFacilityMemberAction,
} from "@/app/(app)/facility/members/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { FacilityMembershipRole } from "@/lib/auth/workspace-model";

const ROLES: FacilityMembershipRole[] = [
  "owner",
  "admin",
  "recruiter",
  "viewer",
];

export function FacilityMembersManager({
  members,
  pendingInvites,
  currentUserId,
  canManage,
}: {
  members: Array<{
    userId: string;
    memberName?: string | null;
    memberEmail?: string | null;
    membershipRole: FacilityMembershipRole;
  }>;
  pendingInvites: Array<{
    id: string;
    email: string;
    membershipRole: FacilityMembershipRole;
    expiresAt: Date;
  }>;
  currentUserId: string;
  canManage: boolean;
}) {
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const invite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setInviteUrl(null);
    try {
      const result = await inviteFacilityMemberAction(
        new FormData(event.currentTarget),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setInviteUrl(result.inviteUrl);
      toast.success(
        result.emailed
          ? "Invitation sent"
          : "Invitation created. Copy the link to share it.",
      );
      event.currentTarget.reset();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {canManage ? (
        <Card>
          <CardBody className="flex min-w-0 flex-col gap-3 pt-5">
            <h2 className="text-[15px] font-semibold">Invite member</h2>
            <form onSubmit={invite} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="membershipRole">Role</Label>
                <select
                  id="membershipRole"
                  name="membershipRole"
                  defaultValue="recruiter"
                  className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Invite member
              </Button>
            </form>
            {inviteUrl ? (
              <p className="break-all text-[12.5px] text-[color:var(--color-ink-600)]">
                Share this link: {inviteUrl}
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="flex min-w-0 flex-col gap-3 pt-5">
          <h2 className="text-[15px] font-semibold">Members</h2>
          <ul className="flex flex-col gap-3">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex min-w-0 flex-col gap-2 border-b border-[color:var(--color-border-default)] pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">
                    {member.memberName ?? "Member"}
                    {member.userId === currentUserId ? " (you)" : ""}
                  </p>
                  <p className="truncate text-[12px] text-[color:var(--color-ink-500)]">
                    {member.memberEmail}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <form
                      action={async (formData) => {
                        const result = await changeFacilityMemberRoleAction(formData);
                        if (!result.ok) toast.error(result.error);
                      }}
                      className="flex gap-2"
                    >
                      <input type="hidden" name="userId" value={member.userId} />
                      <select
                        name="membershipRole"
                        defaultValue={member.membershipRole}
                        className="h-9 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-2 text-sm"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="secondary">
                        Save
                      </Button>
                    </form>
                    {member.userId !== currentUserId ? (
                      <form
                        action={async (formData) => {
                          const result = await revokeFacilityMemberAction(formData);
                          if (!result.ok) toast.error(result.error);
                        }}
                      >
                        <input type="hidden" name="userId" value={member.userId} />
                        <Button type="submit" size="sm" variant="secondary">
                          Remove
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    {member.membershipRole.charAt(0).toUpperCase() +
                      member.membershipRole.slice(1)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {canManage && pendingInvites.length > 0 ? (
        <Card>
          <CardBody className="flex min-w-0 flex-col gap-3 pt-5">
            <h2 className="text-[15px] font-semibold">Pending invitations</h2>
            <ul className="flex flex-col gap-2">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-3 text-[13px]"
                >
                  <span className="min-w-0 truncate">
                    {invite.email} · {invite.membershipRole}
                  </span>
                  <form
                    action={async (formData) => {
                      const result = await revokeFacilityInviteAction(formData);
                      if (!result.ok) toast.error(result.error);
                    }}
                  >
                    <input type="hidden" name="invitationId" value={invite.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      Revoke
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <form
        action={async () => {
          const result = await leaveFacilityAction();
          if (result && "ok" in result && !result.ok) toast.error(result.error);
        }}
      >
        <Button type="submit" variant="secondary">
          Leave facility
        </Button>
      </form>
    </div>
  );
}
