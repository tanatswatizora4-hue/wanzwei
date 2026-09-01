"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { completePasswordResetAction } from "@/app/(marketing)/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ResetPasswordForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await completePasswordResetAction(
        new FormData(event.currentTarget),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.replace("/login?password-updated=1");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <p className="rounded-[var(--radius-sm)] bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
        Your password was updated. You can sign in with your new password.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-3.5">
      <div className="grid gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          maxLength={128}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          maxLength={128}
          required
        />
      </div>
      {error ? (
        <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
        {submitting ? "Updating…" : "Update password"}
      </Button>
      <p className="mt-2 text-center text-[13px] text-[color:var(--color-ink-500)]">
        <Link
          href="/forgot-password"
          className="font-medium text-[color:var(--color-brand-600)] hover:underline"
        >
          Request a new reset link
        </Link>
      </p>
    </form>
  );
}
