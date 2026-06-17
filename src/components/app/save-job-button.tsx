"use client";

import * as React from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleSaveJobAction } from "@/app/(app)/professional/jobs/actions";
import { cn } from "@/lib/cn";

export function SaveJobButton({
  jobId,
  jobTitle,
  defaultSaved = false,
  className,
}: {
  jobId: string;
  jobTitle: string;
  defaultSaved?: boolean;
  className?: string;
}) {
  const [saved, setSaved] = React.useState(defaultSaved);
  const [pending, setPending] = React.useState(false);

  const toggle = async () => {
    if (pending) return;
    const next = !saved;
    setPending(true);
    try {
      const result = await toggleSaveJobAction(jobId, next);
      if (result.ok) {
        setSaved(next);
        toast.success(next ? "Job saved" : "Removed from saved", {
          description: jobTitle,
        });
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      data-job-id={jobId}
      aria-pressed={saved}
      aria-label={saved ? "Unsave job" : "Save job"}
      className={cn(
        "shrink-0 rounded-md p-1.5 text-[color:var(--color-ink-400)] hover:text-[color:var(--color-brand-600)] hover:bg-[color:var(--color-brand-50)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]/40 disabled:opacity-50",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bookmark
          className={cn(
            "h-4 w-4 transition-colors",
            saved && "fill-current text-[color:var(--color-brand-600)]",
          )}
          strokeWidth={1.8}
        />
      )}
    </button>
  );
}
