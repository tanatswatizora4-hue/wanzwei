"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { closeJobAction } from "@/app/(app)/facility/jobs/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";

export function FacilityJobMenu({
  jobId,
  jobTitle,
  status,
}: {
  jobId: string;
  jobTitle: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const handleClose = async () => {
    if (pending || status !== "Open") return;
    setPending(true);
    try {
      const result = await closeJobAction(jobId);
      if (result.ok) {
        toast.success("Role closed", { description: jobTitle });
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconSm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/facility/applications">
            <Eye className="h-3.5 w-3.5" /> View applicants
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          danger
          disabled={status !== "Open" || pending}
          onClick={handleClose}
        >
          Close role
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
