"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createProfessionalWorkspaceAction } from "@/app/(app)/workspace/actions";
import { ProfessionSelect } from "@/components/app/profession-select";
import { RegulatoryBodySelect } from "@/components/app/regulatory-body-select";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { isOtherRegulatoryBody } from "@/lib/regulatory-bodies";

export function AddProfessionalProfileForm() {
  const [pending, setPending] = React.useState(false);
  const [body, setBody] = React.useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await createProfessionalWorkspaceAction(
        new FormData(event.currentTarget),
      );
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create profile.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-3">
      <ProfessionSelect name="profession" required />
      <div>
        <Label htmlFor="registeringBody">Regulatory body</Label>
        <RegulatoryBodySelect required onValueChange={setBody} />
      </div>
      {isOtherRegulatoryBody(body) ? (
        <div>
          <Label htmlFor="regulatoryBodyOther">Name of regulatory body</Label>
          <Input id="regulatoryBodyOther" name="regulatoryBodyOther" required />
        </div>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Create professional profile
      </Button>
    </form>
  );
}
