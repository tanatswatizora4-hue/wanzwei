"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";

export function MatchingColumnMenu({ stage }: { stage: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${stage} column options`}
        className="text-[color:var(--color-ink-400)] hover:text-[color:var(--color-ink-700)] rounded p-1 hover:bg-[color:var(--color-ink-900)]/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]/40"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{stage}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => toast.message(`Sorting "${stage}" by match score…`)}
        >
          Sort by match score
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => toast.message(`Sorting "${stage}" by date added…`)}
        >
          Sort by date added
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => toast.success(`Exporting "${stage}" as CSV…`)}
        >
          Export column
        </DropdownMenuItem>
        <DropdownMenuItem
          danger
          onSelect={() => toast.warning(`"${stage}" clear action is not wired yet.`)}
        >
          Clear column
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AddMatchingCardButton({ stage }: { stage: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        toast.info(`"Add to ${stage}" — coming soon.`, {
          description: "We're wiring this up to the candidate picker.",
        })
      }
      className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] py-2 text-[12px] text-[color:var(--color-ink-400)] hover:text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-ink-900)]/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]/40"
    >
      + Add card
    </button>
  );
}
