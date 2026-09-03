"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  completeCourseEnrolmentAction,
  enrolInCourseAction,
  withdrawCourseEnrolmentAction,
} from "@/app/(app)/professional/cpd/actions";
import { Button } from "@/components/ui/button";
import type { CourseEnrolmentStatus } from "@/lib/types";

export function CpdEnrolButtons({
  courseId,
  status,
}: {
  courseId: string;
  status: CourseEnrolmentStatus | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  const run = async (
    label: string,
    action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) => {
    if (pending) return;
    setPending(label);
    try {
      const formData = new FormData();
      formData.set("courseId", courseId);
      const result = await action(formData);
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update CPD.");
    } finally {
      setPending(null);
    }
  };

  if (status === "completed") {
    return (
      <p className="text-[13px] font-medium text-[color:var(--color-success-700)]">
        Recorded as completed
      </p>
    );
  }

  if (status === "registered") {
    return (
      <div className="flex min-w-0 flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending !== null}
          onClick={() =>
            run(
              "complete",
              completeCourseEnrolmentAction,
              "Completion recorded for your CPD history",
            )
          }
        >
          {pending === "complete" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          Mark complete
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending !== null}
          onClick={() =>
            run("withdraw", withdrawCourseEnrolmentAction, "Registration withdrawn")
          }
        >
          {pending === "withdraw" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          Withdraw
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      disabled={pending !== null}
      onClick={() =>
        run("enrol", enrolInCourseAction, "Registered for this CPD opportunity")
      }
    >
      {pending === "enrol" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : null}
      Register
    </Button>
  );
}
