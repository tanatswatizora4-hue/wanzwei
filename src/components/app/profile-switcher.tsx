"use client";

import Link from "next/link";
import { Check, Plus } from "lucide-react";

import { switchWorkspaceAction } from "@/app/(app)/workspace/actions";
import type { switcherProfiles } from "@/lib/auth/workspace-model";
import { cn } from "@/lib/cn";

type SwitcherItem = ReturnType<typeof switcherProfiles>[number];

export function ProfileSwitcher({
  profiles,
  activeKey,
  hasProfessional = true,
  showAddProfessional = false,
}: {
  profiles: SwitcherItem[];
  activeKey: string;
  hasProfessional?: boolean;
  showAddProfessional?: boolean;
}) {
  const current = profiles.find((profile) => profile.key === activeKey);
  const others = profiles.filter((profile) => profile.key !== activeKey);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {current ? (
        <div>
          <p className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            Current
          </p>
          <SwitcherRow profile={current} selected />
        </div>
      ) : null}

      {others.length > 0 ? (
        <div>
          <p className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            Other profiles
          </p>
          {others.map((profile) => (
            <SwitcherForm key={profile.key} profile={profile} />
          ))}
        </div>
      ) : null}

      <div className="mt-1 border-t border-[color:var(--color-border-default)] pt-2">
        <Link
          href="/workspaces/add"
          className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] font-medium text-[color:var(--color-brand-700)] hover:bg-[color:var(--color-brand-50)]"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          Create or join a facility
        </Link>
        {showAddProfessional && !hasProfessional ? (
          <Link
            href="/workspaces/add#professional"
            className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] font-medium text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-brand-50)]"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            Add Professional profile
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function SwitcherForm({
  profile,
  selected = false,
}: {
  profile: SwitcherItem;
  selected?: boolean;
}) {
  return (
    <form
      action={
        switchWorkspaceAction as unknown as (formData: FormData) => Promise<void>
      }
    >
      <input type="hidden" name="workspace" value={profile.key} />
      <button type="submit" className="w-full">
        <SwitcherRow profile={profile} selected={selected} />
      </button>
    </form>
  );
}

function SwitcherRow({
  profile,
  selected,
}: {
  profile: SwitcherItem;
  selected?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex w-full items-start gap-2 rounded-[6px] px-2 py-1.5 text-left",
        selected && "bg-[color:var(--color-brand-50)]",
      )}
    >
      <span className="mt-0.5 w-4 shrink-0 text-[color:var(--color-brand-600)]">
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">
          {profile.label}
        </span>
        <span className="block text-[11px] text-[color:var(--color-ink-400)]">
          {profile.subtitle}
        </span>
      </span>
    </span>
  );
}
