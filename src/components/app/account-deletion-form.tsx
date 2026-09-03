"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { deleteOwnAccountAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ACCOUNT_DELETION_CONFIRMATION } from "@/lib/auth/account-deletion";

export function AccountDeletionForm({
  email,
  hasPasswordAuth,
}: {
  email: string;
  hasPasswordAuth: boolean;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await deleteOwnAccountAction(
        new FormData(event.currentTarget),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.location.assign("/login?account=deleted");
    } finally {
      setSubmitting(false);
    }
  };

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="danger"
        className="min-h-11"
        onClick={() => setConfirming(true)}
      >
        Delete account
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-[12.5px] font-medium text-[color:var(--color-ink-700)]">
        Confirm deletion
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="emailConfirmation">Account email</Label>
        <Input
          id="emailConfirmation"
          name="emailConfirmation"
          type="email"
          autoComplete="username"
          required
          placeholder={email}
        />
      </div>
      {hasPasswordAuth ? (
        <div className="grid gap-1.5">
          <Label htmlFor="deletePassword">Password</Label>
          <Input
            id="deletePassword"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      ) : (
        <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
          This account uses Google sign-in. Type your email and DELETE to
          confirm. You will be signed out immediately after deletion.
        </p>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="confirmation">
          Type {ACCOUNT_DELETION_CONFIRMATION} to confirm
        </Label>
        <Input
          id="confirmation"
          name="confirmation"
          required
          autoComplete="off"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" className="min-h-11" disabled={submitting}>
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Permanently close account
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={submitting}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
