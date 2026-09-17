"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { cn } from "@/lib/cn";
import type { Role, User } from "@/lib/types";
import type {
  FacilityMembershipRole,
  switcherProfiles,
} from "@/lib/auth/workspace-model";

type SwitcherItem = ReturnType<typeof switcherProfiles>[number];

export function AppShell({
  user,
  unreadNotificationCount = 0,
  children,
  navRole,
  switcherProfiles: profiles = [],
  activeWorkspaceKey,
  facilityRole = null,
  hasProfessional = true,
}: {
  user: User;
  unreadNotificationCount?: number;
  children: React.ReactNode;
  navRole: Role;
  switcherProfiles?: SwitcherItem[];
  activeWorkspaceKey: string;
  facilityRole?: FacilityMembershipRole | null;
  hasProfessional?: boolean;
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

    const body = document.body;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [mobileNavOpen, closeMobileNav]);

  return (
    <div className="relative flex min-h-dvh overflow-x-hidden">
      <button
        type="button"
        aria-label="Close navigation"
        aria-hidden={!mobileNavOpen}
        tabIndex={mobileNavOpen ? 0 : -1}
        className={cn(
          "wz-drawer-backdrop fixed inset-0 z-40 bg-ink-900/60 backdrop-blur-[2px] lg:hidden",
          mobileNavOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={closeMobileNav}
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(244px,100%)] max-w-full overflow-x-hidden max-lg:bg-surface wz-drawer max-lg:transition-transform max-lg:duration-[180ms] max-lg:ease-out lg:static lg:z-20 lg:translate-x-0 lg:pointer-events-auto",
          mobileNavOpen
            ? "translate-x-0"
            : "-translate-x-full pointer-events-none lg:translate-x-0",
        )}
      >
        <Sidebar
          user={user}
          navRole={navRole}
          onNavigate={closeMobileNav}
          switcherProfiles={profiles}
          activeWorkspaceKey={activeWorkspaceKey}
          facilityRole={facilityRole}
          hasProfessional={hasProfessional}
        />
        <button
          type="button"
          onClick={closeMobileNav}
          className="absolute right-2 top-[calc(0.65rem+env(safe-area-inset-top))] inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--color-ink-700)] transition-colors duration-150 hover:bg-white/70 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          navRole={navRole}
          unreadNotificationCount={unreadNotificationCount}
          onOpenMobileNav={openMobileNav}
          mobileNavOpen={mobileNavOpen}
          switcherProfiles={profiles}
          activeWorkspaceKey={activeWorkspaceKey}
          facilityRole={facilityRole}
          hasProfessional={hasProfessional}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
