"use client";

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/auth/professional-verification";
import { applyForJobAction } from "@/app/(app)/professional/jobs/actions";
import { Button } from "@/components/ui/button";

export function ApplyJobButton({
  jobId,
  jobTitle,
  defaultApplied = false,
  size = "sm",
  verified = false,
}: {
  jobId: string;
  jobTitle: string;
  defaultApplied?: boolean;
  size?: "sm" | "md";
  verified?: boolean;
}) {
  const [applied, setApplied] = React.useState(defaultApplied);
  const [pending, setPending] = React.useState(false);

  const handleApply = async () => {
    if (applied || pending) return;
    if (!verified) {
      toast.error(PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE);
      return;
    }
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
