"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, HelpCircle, Search, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { CommandPalette } from "./command-palette";
import type { User } from "@/lib/types";

export function Topbar({
  user,
  unreadNotificationCount = 0,
}: {
  user: User;
  unreadNotificationCount?: number;
}) {
  const openCommandPalette = React.useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );
  }, []);

  const onSearchFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.blur();
    openCommandPalette();
  };

  const roleLabel =
    user.role === "professional"
      ? "Professional"
      : user.role === "facility"
        ? "Facility"
        : "Admin";

  const quickAction =
    user.role === "facility"
      ? { label: "Post Job", href: "/facility/jobs?new=1" }
      : user.role === "admin"
        ? { label: "Review Queue", href: "/admin/verification" }
        : { label: "Quick Apply", href: "/professional/jobs" };

  // Only the professional role has a dedicated notifications page today.
  const notificationsHref =
    user.role === "professional" ? "/professional/notifications" : null;

  const settingsHref =
    user.role === "facility"
      ? "/facility/settings"
      : user.role === "admin"
        ? "/admin/settings"
        : "/professional/settings";

  const profileHref =
    user.role === "facility"
      ? "/facility/profile"
      : user.role === "professional"
        ? "/professional/profile"
        : "/admin/users";

  const notificationBadge =
    unreadNotificationCount > 0 ? String(unreadNotificationCount) : undefined;

  return (
    <header className="topbar-band sticky top-0 z-30 flex h-14 items-center gap-3 px-5">
      <CommandPalette role={user.role} />

      {/* Search — short placeholder avoids clipping when the pill is narrow */}
      <div className="relative min-w-[7.5rem] flex-1 max-w-xl md:max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-white/55" />
        <input
          aria-label="Search jobs, facilities, professionals, and navigate"
          placeholder="Search…"
          title="Opens command palette · Ctrl K / ⌘ K"
          onFocus={onSearchFocus}
          readOnly
          className="h-9 w-full cursor-pointer truncate rounded-full border border-white/15 bg-white/10 pl-9 pr-9 text-[13px] text-white placeholder:text-white/65 outline-none transition hover:bg-white/15 focus:bg-white/15 focus:border-white/30 sm:pr-[4.75rem]"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden h-5 -translate-y-1/2 items-center gap-0.5 rounded-md border border-white/15 bg-white/10 px-1.5 text-[10px] font-semibold text-white/75 sm:inline-flex">
          ⌘ K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Quick action pill */}
        <Link
          href={quickAction.href}
          aria-label={quickAction.label}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/95 hover:bg-white px-3 h-8 text-[12.5px] font-semibold text-[color:var(--color-brand-700)] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_2px_8px_rgba(0,0,0,0.18)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Plus className="h-3.5 w-3.5" />
          {quickAction.label}
        </Link>

        {/* Icon group */}
        <div className="flex items-center gap-0.5 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur p-0.5">
          <IconButton
            aria-label="Open command palette"
            title="Search and navigate · ⌘K"
            onClick={openCommandPalette}
          >
            <HelpCircle className="h-4 w-4" />
          </IconButton>
          {notificationsHref ? (
            <IconButtonLink
              href={notificationsHref}
              aria-label="Notifications"
              badge={notificationBadge}
            >
              <Bell className="h-4 w-4" />
            </IconButtonLink>
          ) : (
            <IconButton
              aria-label="Notifications"
              onClick={() =>
                toast.info("Notifications coming soon for this role.")
              }
            >
              <Bell className="h-4 w-4" />
            </IconButton>
          )}
        </div>

        {/* Profile chip */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur",
              "pl-0.5 pr-2.5 py-0.5 hover:bg-white/15 focus:outline-none transition",
            )}
          >
            <span className="relative">
              <Avatar
                name={user.name}
                size={28}
                className="ring-2 ring-white/40"
                src={user.avatar}
              />
              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1B1463]" />
            </span>
            <div className="hidden md:flex flex-col items-start leading-tight min-w-0">
              <span className="max-w-[120px] truncate text-[12.5px] font-semibold text-white">
                {user.name.split(" ")[0]} {user.name.split(" ")[1]?.[0]}.
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/55">
                {roleLabel}
              </span>
            </div>
            <ChevronDown className="hidden md:block h-3.5 w-3.5 text-white/55" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <Avatar name={user.name} size={36} />
              <div className="min-w-0 leading-tight">
                <p className="text-[13px] font-semibold truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-[color:var(--color-ink-400)] truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={profileHref}>Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={settingsHref}>Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                toast.info("Billing is coming soon.", {
                  description: "We'll let you know when it's ready.",
                })
              }
            >
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                toast.info("Invite team is coming soon.", {
                  description: "Team seats roll out next release.",
                })
              }
            >
              Invite team
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="w-full text-left rounded-[6px] px-2 py-1.5 text-sm text-[color:var(--color-danger-700)] hover:bg-rose-50"
              >
                Log out
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

const iconBtnClass =
  "relative inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

function Badge({ badge }: { badge?: string }) {
  if (!badge) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 px-1 text-[9.5px] font-bold leading-none text-white ring-2 ring-[#231271] shadow-[0_2px_6px_rgba(244,114,182,0.45)]">
      {badge}
    </span>
  );
}

function IconButton({
  children,
  badge,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { badge?: string }) {
  return (
    <button type="button" {...props} className={iconBtnClass}>
      {children}
      <Badge badge={badge} />
    </button>
  );
}

function IconButtonLink({
  children,
  badge,
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  badge?: string;
  href: string;
}) {
  return (
    <Link href={href} {...props} className={iconBtnClass}>
      {children}
      <Badge badge={badge} />
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Stack actions under the title on most widths so the buttons
        // never crowd/cover the heading. Only switch to a split header
        // on large screens.
        "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {meta ? (
          <div className="mb-2 flex items-center gap-2">{meta}</div>
        ) : null}
        <h1 className="font-display text-[24px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-[13.5px] text-[color:var(--color-ink-500)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
