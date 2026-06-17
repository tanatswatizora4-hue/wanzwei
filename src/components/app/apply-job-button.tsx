"use client";

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { applyForJobAction } from "@/app/(app)/professional/jobs/actions";
import { Button } from "@/components/ui/button";

export function ApplyJobButton({
  jobId,
  jobTitle,
  defaultApplied = false,
  size = "sm",
}: {
  jobId: string;
  jobTitle: string;
  defaultApplied?: boolean;
  size?: "sm" | "md";
}) {
  const [applied, setApplied] = React.useState(defaultApplied);
  const [pending, setPending] = React.useState(false);

  const handleApply = async () => {
    if (applied || pending) return;
    setPending(true);
    try {
      const result = await applyForJobAction(jobId);
      if (result.ok) {
        setApplied(true);
        toast.success("Application submitted", { description: jobTitle });
      } else {
        if (result.error.includes("already applied")) {
          setApplied(true);
        }
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      disabled={applied || pending}
      onClick={handleApply}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : applied ? (
        "Applied"
      ) : (
        <>
          Apply <ArrowRight className="h-3.5 w-3.5" />
        </>
      )}
    </Button>
  );
}
