"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateApplicationStatusAction } from "@/app/(app)/applications/actions";
import type { ApplicationStatus } from "@/lib/types";
import { nextApplicationStatuses } from "@/lib/applications/transitions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ApplicationStatusSelect({
  applicationId,
  value,
}: {
  applicationId: string;
  value: ApplicationStatus;
}) {
  const [current, setCurrent] = React.useState(value);
  const [pending, setPending] = React.useState(false);
  const options = nextApplicationStatuses(current);

  const onChange = async (next: string) => {
    const status = next as ApplicationStatus;
    if (status === current || pending) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("applicationId", applicationId);
      formData.set("status", status);
      const result = await updateApplicationStatusAction(formData);
      if (result.ok) {
        setCurrent(status);
        toast.success("Application status updated");
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--color-ink-400)]" />
      ) : null}
      <Select value={current} onValueChange={onChange} disabled={pending}>
        <SelectTrigger className="h-8 w-[160px] text-[12px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
