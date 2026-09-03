"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/auth/professional-verification";
import { respondToAlertAction } from "@/app/(app)/professional/dashboard/actions";
import { Button } from "@/components/ui/button";

export function EmergencyAlertRespondButtons({
  alertId,
  verified = false,
}: {
  alertId: string;
  verified?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"Accepted" | "Declined" | null>(
    null,
  );

  const respond = async (response: "Accepted" | "Declined") => {
    if (pending) return;
    if (!verified) {
      toast.error(PROFESSIONAL_VERIFICATION_REQUIRED_MESSAGE);
      return;
    }
    setPending(response);
    try {
      const formData = new FormData();
      formData.set("alertId", alertId);
      formData.set("response", response);
      const result = await respondToAlertAction(formData);
      if (result.ok) {
        toast.success(
          response === "Accepted" ? "Shift accepted" : "Alert declined",
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not respond to this alert.";
      toast.error(message);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        disabled={Boolean(pending)}
        onClick={() => respond("Declined")}
      >
        {pending === "Declined" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        Decline
      </Button>
      <Button
        size="sm"
        type="button"
        disabled={Boolean(pending)}
        onClick={() => respond("Accepted")}
      >
        {pending === "Accepted" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        Accept shift
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
