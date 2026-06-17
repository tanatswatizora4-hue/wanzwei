"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  GraduationCap,
  Store,
  ShieldCheck,
  Settings,
  Users,
  Bookmark,
  MessageSquare,
  Search,
  Sparkles,
  Workflow,
  Stethoscope,
  CalendarClock,
  FileBadge,
  Siren,
} from "lucide-react";
import { Command } from "cmdk";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/types";

type Cmd = {
  group: string;
  label: string;
  href?: string;
  icon: React.ReactNode;
  shortcut?: string;
};

function commands(role: Role): Cmd[] {
  const base = role === "facility"
    ? "/facility"
    : role === "admin"
      ? "/admin"
      : "/professional";

  const navCommon: Cmd[] = [
    {
      group: "Navigate",
      label: "Dashboard",
      href: `${base}/dashboard`,
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
      shortcut: "G D",
    },
    {
      group: "Navigate",
      label: "Settings",
      href: `${base}/settings`,
      icon: <Settings className="h-3.5 w-3.5" />,
      shortcut: "G S",
    },
  ];

  if (role === "professional") {
    return [
      ...navCommon,
      {
        group: "Navigate",
        label: "Browse jobs",
        href: "/professional/jobs",
        icon: <Briefcase className="h-3.5 w-3.5" />,
        shortcut: "G J",
      },
      {
        group: "Navigate",
        label: "My applications",
        href: "/professional/applications",
        icon: <FileText className="h-3.5 w-3.5" />,
        shortcut: "G A",
      },
      {
        group: "Navigate",
        label: "Saved jobs",
        href: "/professional/saved",
        icon: <Bookmark className="h-3.5 w-3.5" />,
      },
      {
        group: "Navigate",
        label: "Messages",
        href: "/professional/messages",
        icon: <MessageSquare className="h-3.5 w-3.5" />,
      },
      {
        group: "Navigate",
        label: "My profile",
        href: "/professional/profile",
        icon: <Stethoscope className="h-3.5 w-3.5" />,
      },
      {
        group: "Navigate",
        label: "CPD",
        href: "/professional/cpd",
        icon: <GraduationCap className="h-3.5 w-3.5" />,
        shortcut: "G C",
      },
      {
        group: "Navigate",
        label: "Marketplace",
        href: "/professional/marketplace",
        icon: <Store className="h-3.5 w-3.5" />,
        shortcut: "G M",
      },
      {
        group: "Navigate",
        label: "Documents",
        href: "/professional/documents",
        icon: <FileBadge className="h-3.5 w-3.5" />,
      },
      {
        group: "Navigate",
        label: "Availability",
        href: "/professional/availability",
        icon: <CalendarClock className="h-3.5 w-3.5" />,
      },
    ];
  }

  if (role === "facility") {
    return [
      ...navCommon,
      {
        group: "Navigate",
        label: "Jobs",
        href: "/facility/jobs",
        icon: <Briefcase className="h-3.5 w-3.5" />,
        shortcut: "G J",
      },
      {
        group: "Navigate",
        label: "Applicants",
        href: "/facility/applications",
        icon: <Users className="h-3.5 w-3.5" />,
        shortcut: "G A",
      },
      {
        group: "Actions",
        label: "Send Emergency Locum Alert",
        href: "/facility/emergency",
        icon: <Siren className="h-3.5 w-3.5" />,
        shortcut: "G E",
      },
      {
        group: "Navigate",
        label: "Talent pool",
        href: "/facility/talent",
        icon: <Stethoscope className="h-3.5 w-3.5" />,
      },
      {
        group: "Navigate",
        label: "Marketplace",
        href: "/facility/marketplace",
        icon: <Store className="h-3.5 w-3.5" />,
      },
      {
        group: "Navigate",
        label: "CPD",
        href: "/facility/cpd",
        icon: <GraduationCap className="h-3.5 w-3.5" />,
      },
    ];
  }

  return [
    ...navCommon,
    {
      group: "Navigate",
      label: "Verification queue",
      href: "/admin/verification",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      shortcut: "G V",
    },
    {
      group: "Navigate",
      label: "Matching workflow",
      href: "/admin/matching",
      icon: <Workflow className="h-3.5 w-3.5" />,
      shortcut: "G M",
    },
    {
      group: "Navigate",
      label: "Jobs overview",
      href: "/admin/jobs",
      icon: <Briefcase className="h-3.5 w-3.5" />,
    },
    {
      group: "Navigate",
      label: "Applications overview",
      href: "/admin/applications",
      icon: <FileText className="h-3.5 w-3.5" />,
    },
    {
      group: "Navigate",
      label: "Users",
      href: "/admin/users",
      icon: <Users className="h-3.5 w-3.5" />,
    },
  ];
}

const ACTIONS: Cmd[] = [
  {
    group: "Actions",
    label: "AI: Find best candidate match",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    group: "Actions",
    label: "Invite a teammate",
    icon: <Users className="h-3.5 w-3.5" />,
  },
];

export function CommandPalette({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const cmds = React.useMemo(() => [...commands(role), ...ACTIONS], [role]);

  const grouped = React.useMemo(() => {
    const acc: Record<string, Cmd[]> = {};
    for (const c of cmds) {
      acc[c.group] = acc[c.group] ?? [];
      acc[c.group].push(c);
    }
    return acc;
  }, [cmds]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Quickly navigate or run actions
        </DialogDescription>
        <Command
          loop
          className="flex flex-col"
          filter={(value, search) => {
            const v = value.toLowerCase();
            const s = search.toLowerCase();
            return v.includes(s) ? 1 : 0;
          }}
        >
          <div className="flex items-center gap-2 border-b border-[color:var(--color-border-default)] px-4">
            <Search className="h-4 w-4 text-[color:var(--color-ink-400)]" />
            <Command.Input
              placeholder="Search or jump to…"
              className="flex h-11 w-full bg-transparent text-[14px] placeholder:text-[color:var(--color-ink-400)] focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] px-1.5 text-[10.5px] text-[color:var(--color-ink-500)] font-medium">
              Esc
            </kbd>
          </div>
          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-[13px] text-[color:var(--color-ink-400)]">
              No results found.
            </Command.Empty>
            {Object.entries(grouped).map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {items.map((c) => (
                  <Command.Item
                    key={c.label}
                    value={c.label}
                    onSelect={() => {
                      if (c.href) router.push(c.href);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex cursor-pointer select-none items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[13px] text-[color:var(--color-ink-700)]",
                      "aria-selected:bg-[color:var(--color-brand-50)] aria-selected:text-[color:var(--color-brand-700)]",
                    )}
                  >
                    <span className="text-[color:var(--color-ink-400)]">
                      {c.icon}
                    </span>
                    <span className="flex-1">{c.label}</span>
                    {c.shortcut ? (
                      <kbd className="inline-flex h-5 items-center rounded border border-[color:var(--color-border-default)] bg-white px-1.5 text-[10px] text-[color:var(--color-ink-500)] font-medium">
                        {c.shortcut}
                      </kbd>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
