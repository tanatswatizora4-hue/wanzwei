"use client";

import { Check } from "lucide-react";

import { switchWorkspaceAction } from "@/app/(app)/workspace/actions";
import type { switcherProfiles } from "@/lib/auth/workspace-model";
import { cn } from "@/lib/cn";

type SwitcherItem = ReturnType<typeof switcherProfiles>[number];

export function ProfileSwitcher({
  profiles,
  activeKey,
}: {
  profiles: SwitcherItem[];
  activeKey: string;
}) {
  if (profiles.length < 2) return null;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
        Switch Profile
      </p>
      {profiles.map((profile) => {
        const selected = profile.key === activeKey;
        return (
          <form
            key={profile.key}
            action={
              switchWorkspaceAction as unknown as (
                formData: FormData,
              ) => Promise<void>
            }
          >
            <input type="hidden" name="workspace" value={profile.key} />
            <button
              type="submit"
              className={cn(
                "flex w-full items-start gap-2 rounded-[6px] px-2 py-1.5 text-left hover:bg-[color:var(--color-brand-50)]",
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
            </button>
          </form>
        );
      })}
    </div>
  );
}
