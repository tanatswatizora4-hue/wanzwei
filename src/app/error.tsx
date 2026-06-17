"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-md)] text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <h2 className="mt-3 text-[18px] font-semibold tracking-tight">
          Something went wrong
        </h2>
        <p className="mt-1 text-[13px] text-[color:var(--color-ink-500)]">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest ? (
          <p className="mt-3 inline-block rounded-md bg-[color:var(--color-surface-muted)] px-2 py-1 font-mono text-[11px] text-[color:var(--color-ink-500)]">
            ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
