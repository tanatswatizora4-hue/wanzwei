"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export function SaveCandidateButton({
  candidateName,
  defaultSaved = false,
}: {
  candidateName: string;
  defaultSaved?: boolean;
}) {
  const [saved, setSaved] = React.useState(defaultSaved);

  const toggle = () => {
    setSaved((prev) => {
      const next = !prev;
      toast.success(next ? "Saved to talent pool" : "Removed from talent pool", {
        description: candidateName,
      });
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Unsave candidate" : "Save candidate"}
      className={cn(
        "rounded-md p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]/40",
        saved
          ? "text-rose-500 hover:bg-rose-50"
          : "text-[color:var(--color-ink-400)] hover:text-rose-500 hover:bg-rose-50",
      )}
    >
      <Heart
        className={cn("h-4 w-4 transition-colors", saved && "fill-current")}
      />
    </button>
  );
}
