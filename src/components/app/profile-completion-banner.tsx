"use client";

import * as React from "react";
import Link from "next/link";
import { Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "wanzwei:profile-banner-dismissed";

export function ProfileCompletionBanner({ href }: { href: string }) {
  const [dismissed, setDismissed] = React.useState(() => {
    if (typeof sessionStorage === "undefined") return false;
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const onDismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setDismissed(true);
  };

  return (
    <div className="glass glass-highlight relative overflow-hidden rounded-[var(--radius-lg)] p-5">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(110deg, rgba(111,94,240,0.18) 0%, rgba(255,153,235,0.14) 60%, transparent 90%)",
        }}
      />
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-brand-600)] text-white shadow-[var(--shadow-md)]">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Stand out to employers</p>
          <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
            Complete your profile and get 3.2× more job matches.
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href={href}>Complete Profile</Link>
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-full p-1 text-[color:var(--color-ink-400)] hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]/40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
