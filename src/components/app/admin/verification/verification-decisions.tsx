"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import type { VerificationStatus } from "@/lib/types";

type Decision = Extract<VerificationStatus, "Verified" | "Rejected" | "Under Review">;

export function AdminVerificationDecisions({
  verificationId,
  status,
}: {
  verificationId: string;
  status: VerificationStatus;
}) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState<Decision | null>(null);

  const decide = async (next: Decision) => {
    setPending(next);
    try {
      const res = await fetch(
        `/api/admin/verifications/${verificationId}/decision`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            status: next,
            reason: reason.trim() || undefined,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Decision failed");
        return;
      }
      toast.success(`Verification set to ${next}`);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardBody className="pt-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
          Manual decision
        </h2>
        <label className="mt-3 block text-[12.5px] text-[color:var(--color-ink-500)]">
          Reason / note
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-3 py-2 text-[13px] text-[color:var(--color-ink-800)]"
            placeholder="Optional note stored on the verification event"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending !== null || status === "Verified"}
            onClick={() => void decide("Verified")}
          >
            Verify
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending !== null || status === "Under Review"}
            onClick={() => void decide("Under Review")}
          >
            Under Review
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[color:var(--color-danger-700)] hover:bg-rose-50"
            disabled={pending !== null || status === "Rejected"}
            onClick={() => void decide("Rejected")}
          >
            Reject
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
