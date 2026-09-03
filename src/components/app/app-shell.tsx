"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { cn } from "@/lib/cn";
import type { User } from "@/lib/types";

export function AppShell({
  user,
  unreadNotificationCount = 0,
  children,
}: {
  user: User;
  unreadNotificationCount?: number;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const closeMobileNav = React.useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const openMobileNav = React.useCallback(() => {
    setMobileNavOpen(true);
  }, []);

  React.useEffect(() => {
    if (!mobileNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileNav();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen, closeMobileNav]);

  return (
    <div className="relative flex min-h-dvh overflow-x-hidden">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(244px,100%)] max-w-full transition-transform duration-200 ease-out lg:static lg:z-20 lg:translate-x-0 lg:pointer-events-auto",
          mobileNavOpen
            ? "translate-x-0"
            : "-translate-x-full pointer-events-none lg:translate-x-0",
        )}
      >
        <Sidebar user={user} onNavigate={closeMobileNav} />
        <button
          type="button"
          onClick={closeMobileNav}
          className="absolute right-2 top-[calc(0.65rem+env(safe-area-inset-top))] inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--color-ink-700)] hover:bg-white/70 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          unreadNotificationCount={unreadNotificationCount}
          onOpenMobileNav={openMobileNav}
          mobileNavOpen={mobileNavOpen}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
