"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  addNetworkMemberAction,
  removeNetworkMemberAction,
  updateNetworkMemberAction,
} from "@/app/(app)/facility/network/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import {
  NETWORK_RELATIONSHIP_LABELS,
  NETWORK_RELATIONSHIP_TYPES,
  type FacilityNetworkMember,
  type NetworkRelationshipType,
} from "@/lib/broadcasts/network-types";

export function FacilityNetworkManager({
  members,
  canManage,
}: {
  members: FacilityNetworkMember[];
  canManage: boolean;
}) {
  const [pending, setPending] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = members.filter((member) => {
    const haystack = `${member.name} ${member.email} ${member.profession ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const add = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await addNetworkMemberAction(new FormData(event.currentTarget));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Professional added to this network");
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
            <h2 className="text-[15px] font-semibold">Add professional</h2>
            <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
              This is a talent and affiliation list. It does not grant workspace
              access to this facility.
            </p>
            <form
              onSubmit={add}
              className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1">
                <Label htmlFor="email">Professional email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="relationshipType">Relationship</Label>
                <select
                  id="relationshipType"
                  name="relationshipType"
                  defaultValue="approved_locum"
                  className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
                >
                  {NETWORK_RELATIONSHIP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {NETWORK_RELATIONSHIP_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Add to network
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="flex min-w-0 flex-col gap-3 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[15px] font-semibold">Professional network</h2>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, or profession"
              className="sm:max-w-xs"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              {members.length === 0
                ? "No professionals in this network yet."
                : "No professionals match that search."}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filtered.map((member) => (
                <NetworkRow
                  key={member.id}
                  member={member}
                  canManage={canManage}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function NetworkRow({
  member,
  canManage,
}: {
  member: FacilityNetworkMember;
  canManage: boolean;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-2 border-b border-[color:var(--color-border-default)] pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">{member.name}</p>
        <p className="truncate text-[12px] text-[color:var(--color-ink-500)]">
          {member.profession ?? "Profession not set"}
          {member.location ? ` · ${member.location}` : ""}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge tone={member.verified ? "emerald" : "slate"}>
            {member.verified ? "Verified" : "Unverified"}
          </Badge>
          <Badge tone="brand">
            {NETWORK_RELATIONSHIP_LABELS[member.relationshipType]}
          </Badge>
          <Badge tone={member.status === "active" ? "success" : "slate"}>
            {member.status}
          </Badge>
        </div>
      </div>
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <form
            action={async (formData) => {
              const result = await updateNetworkMemberAction(formData);
              if (!result.ok) toast.error(result.error);
            }}
            className="flex gap-2"
          >
            <input
              type="hidden"
              name="professionalUserId"
              value={member.professionalUserId}
            />
            <select
              name="relationshipType"
              defaultValue={member.relationshipType}
              className="h-9 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-2 text-sm"
            >
              {NETWORK_RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {NETWORK_RELATIONSHIP_LABELS[type as NetworkRelationshipType]}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary" size="sm">
              Update
            </Button>
          </form>
          {member.status === "active" ? (
            <form
              action={async (formData) => {
                const result = await updateNetworkMemberAction(formData);
                if (!result.ok) toast.error(result.error);
              }}
            >
              <input
                type="hidden"
                name="professionalUserId"
                value={member.professionalUserId}
              />
              <input type="hidden" name="status" value="inactive" />
              <Button type="submit" variant="ghost" size="sm">
                Deactivate
              </Button>
            </form>
          ) : (
            <form
              action={async (formData) => {
                const result = await updateNetworkMemberAction(formData);
                if (!result.ok) toast.error(result.error);
              }}
            >
              <input
                type="hidden"
                name="professionalUserId"
                value={member.professionalUserId}
              />
              <input type="hidden" name="status" value="active" />
              <Button type="submit" variant="secondary" size="sm">
                Reactivate
              </Button>
            </form>
          )}
          <form
            action={async (formData) => {
              const result = await removeNetworkMemberAction(formData);
              if (!result.ok) toast.error(result.error);
            }}
          >
            <input
              type="hidden"
              name="professionalUserId"
              value={member.professionalUserId}
            />
            <Button type="submit" variant="ghost" size="sm">
              Remove
            </Button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
