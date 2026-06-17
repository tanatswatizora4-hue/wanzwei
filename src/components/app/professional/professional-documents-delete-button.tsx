"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ProfessionalDocumentsDeleteButton({
  documentId,
  enabled = true,
  className,
}: {
  documentId: string;
  enabled?: boolean;
  className?: string;
}) {
  const router = useRouter();

  const onDelete = React.useCallback(async () => {
    if (!enabled) return;
    const confirmed = window.confirm("Delete this document? This cannot be undone.");
    if (!confirmed) return;

    const res = await fetch("/api/uploads/professional", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentId }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Delete failed");
      return;
    }

    toast.success("Document deleted");
    router.refresh();
  }, [documentId, enabled, router]);

  return (
    <Button
      variant="ghost"
      size="iconSm"
      aria-label="Delete"
      onClick={() => void onDelete()}
      className={className}
      disabled={!enabled}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

