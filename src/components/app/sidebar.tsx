"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  ShieldCheck,
  Settings,
  Users,
  Bell,
  Bookmark,
  LogOut,
  Stethoscope,
  Building2,
  FileBadge,
  Siren,
  GraduationCap,
  Store,
  Megaphone,
  Network,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { ProfileSwitcher } from "@/components/app/profile-switcher";
import type { FacilityMembershipRole, switcherProfiles } from "@/lib/auth/workspace-model";
import { facilityCapabilities } from "@/lib/auth/facility-capabilities";
import type { Role, User } from "@/lib/types";

type SwitcherItem = ReturnType<typeof switcherProfiles>[number];

type NavSection = {
  heading?: string;
  items: NavItem[];
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
};

function professionalNav(): NavSection[] {
  return [
    {
      heading: "Discover",
      items: [
        {
          label: "Dashboard",
          href: "/professional/dashboard",
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
      ],
    },
    {
      heading: "Jobs",
      items: [
        {
          label: "Browse Jobs",
          href: "/professional/jobs",
          icon: <Briefcase className="h-4 w-4" />,
        },
        {
          label: "My Applications",
          href: "/professional/applications",
          icon: <FileText className="h-4 w-4" />,
        },
        {
          label: "Saved Jobs",
          href: "/professional/saved",
          icon: <Bookmark className="h-4 w-4" />,
        },
        {
          label: "Opportunities",
          href: "/professional/opportunities",
          icon: <Megaphone className="h-4 w-4" />,
        },
      ],
    },
    {
      heading: "Practice",
      items: [
        {
          label: "CPD",
          href: "/professional/cpd",
          icon: <GraduationCap className="h-4 w-4" />,
        },
        {
          label: "Certificates",
          href: "/professional/cpd/certificates",
          icon: <FileBadge className="h-4 w-4" />,
        },
        {
          label: "Marketplace",
          href: "/professional/marketplace",
          icon: <Store className="h-4 w-4" />,
        },
        {
          label: "My Listings",
          href: "/professional/marketplace/mine",
          icon: <Store className="h-4 w-4" />,
        },
      ],
    },
    {
      heading: "Account",
      items: [
        {
          label: "My Profile",
          href: "/professional/profile",
          icon: <Stethoscope className="h-4 w-4" />,
        },
        {
          label: "Documents",
          href: "/professional/documents",
          icon: <FileBadge className="h-4 w-4" />,
        },
        {
          label: "Notifications",
          href: "/professional/notifications",
          icon: <Bell className="h-4 w-4" />,
        },
        {
          label: "Settings",
          href: "/professional/settings",
          icon: <Settings className="h-4 w-4" />,
        },
      ],
    },
  ];
}

function facilityNav(role: FacilityMembershipRole): NavSection[] {
  const caps = facilityCapabilities(role);
  const hiring = [
    {
      label: "Jobs",
      href: "/facility/jobs",
      icon: <Briefcase className="h-4 w-4" />,
    },
    {
      label: "Applicants",
      href: "/facility/applications",
      icon: <Users className="h-4 w-4" />,
    },
  ];
  if (caps.manageEmergency || caps.viewFacility) {
    hiring.push({
      label: "Emergency",
      href: "/facility/emergency",
      icon: <Siren className="h-4 w-4" />,
    });
  }
  if (caps.viewProfessionalNetwork) {
    hiring.push({
      label: "Network",
      href: "/facility/network",
      icon: <Network className="h-4 w-4" />,
    });
  }
  if (
    caps.createRecruitmentBroadcast ||
    caps.manageEmergency ||
    caps.viewFacility
  ) {
    hiring.push({
      label: "Broadcasts",
      href: "/facility/broadcasts",
      icon: <Megaphone className="h-4 w-4" />,
    });
  }
  hiring.push({
    label: "Marketplace",
    href: "/facility/marketplace",
    icon: <Store className="h-4 w-4" />,
  });
  if (caps.manageMarketplace) {
    hiring.push({
      label: "My Listings",
      href: "/facility/marketplace/mine",
      icon: <Store className="h-4 w-4" />,
    });
  }

  const settingsItems = [
    {
      label: "Facility Profile",
      href: "/facility/profile",
      icon: <Building2 className="h-4 w-4" />,
    },
  ];
  if (caps.manageMembers) {
    settingsItems.push({
      label: "Members",
      href: "/facility/members",
      icon: <Users className="h-4 w-4" />,
    });
  }
  settingsItems.push({
    label: "Settings",
    href: "/facility/settings",
    icon: <Settings className="h-4 w-4" />,
  });

  return [
    {
      heading: "Overview",
      items: [
        {
          label: "Dashboard",
          href: "/facility/dashboard",
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
      ],
    },
    { heading: "Hiring", items: hiring },
    { heading: "Settings", items: settingsItems },
  ];
}

function adminNav(): NavSection[] {
  return [
    {
      heading: "Overview",
      items: [
        {
          label: "Dashboard",
          href: "/admin/dashboard",
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
      ],
    },
    {
      heading: "Operations",
      items: [
        {
          label: "Verification",
          href: "/admin/verification",
          icon: <ShieldCheck className="h-4 w-4" />,
        },
        {
          label: "Jobs",
          href: "/admin/jobs",
          icon: <Briefcase className="h-4 w-4" />,
        },
        {
          label: "Applications",
          href: "/admin/applications",
          icon: <FileText className="h-4 w-4" />,
        },
        {
          label: "Emergency",
          href: "/admin/emergency",
          icon: <Siren className="h-4 w-4" />,
        },
        {
          label: "CPD",
          href: "/admin/cpd",
          icon: <GraduationCap className="h-4 w-4" />,
        },
        {
          label: "Marketplace",
          href: "/admin/marketplace",
          icon: <Store className="h-4 w-4" />,
        },
      ],
    },
    {
      heading: "People",
      items: [
        {
          label: "Users",
          href: "/admin/users",
          icon: <Users className="h-4 w-4" />,
        },
        {
          label: "Facilities",
          href: "/admin/facilities",
          icon: <Building2 className="h-4 w-4" />,
        },
      ],
    },
    {
      heading: "Settings",
      items: [
        {
          label: "Settings",
          href: "/admin/settings",
          icon: <Settings className="h-4 w-4" />,
        },
      ],
    },
  ];
}

export function navForRole(
  role: Role,
  facilityRole: FacilityMembershipRole | null = null,
): NavSection[] {
  if (role === "facility") return facilityNav(facilityRole ?? "viewer");
  if (role === "admin") return adminNav();
  return professionalNav();
}

export function Sidebar({
  navRole,
  onNavigate,
  switcherProfiles: profiles = [],
  activeWorkspaceKey,
  facilityRole = null,
  hasProfessional = true,
}: {
  user: User;
  navRole: Role;
  onNavigate?: () => void;
  switcherProfiles?: SwitcherItem[];
  activeWorkspaceKey: string;
  facilityRole?: FacilityMembershipRole | null;
  hasProfessional?: boolean;
}) {
  const pathname = usePathname();
  const nav = React.useMemo(
    () => navForRole(navRole, facilityRole),
    [navRole, facilityRole],
  );

  return (
    <aside className="glass-panel flex h-dvh min-h-0 w-[244px] max-w-full shrink-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] lg:sticky lg:top-0 lg:h-screen">
      <div className="topbar-band flex h-14 min-h-14 items-center px-5 pr-12 lg:pr-5">
        <Logo tone="dark" size={30} />
      </div>

      <nav id="app-primary-nav" className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Primary">
        {nav.map((section, sectionIdx) => (
          <div key={section.heading ?? `s-${sectionIdx}`} className="mt-3 first:mt-1">
            {section.heading ? (
              <p className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-300)]">
                {section.heading}
              </p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" &&
                    pathname?.startsWith(item.href + "/"));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex min-h-11 items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13.5px] font-medium transition-colors duration-150 ease-out",
                        "text-[color:var(--color-ink-700)] hover:bg-white/60",
                        active &&
                          "bg-white/80 text-[color:var(--color-brand-700)] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-white/70 hover:bg-white/80",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[color:var(--color-ink-400)] group-hover:text-[color:var(--color-ink-700)]",
                          active && "text-[color:var(--color-brand-600)]",
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span
                          className={cn(
                            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold",
                            active
                              ? "bg-white text-[color:var(--color-brand-700)]"
                              : "bg-[color:var(--color-brand-100)] text-[color:var(--color-brand-700)]",
                          )}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/60 px-3 pb-4 pt-2">
        {navRole !== "admin" && profiles.length > 0 ? (
          <div className="mb-2 lg:hidden">
            <ProfileSwitcher
              profiles={profiles}
              activeKey={activeWorkspaceKey}
              hasProfessional={hasProfessional}
              showAddProfessional
            />
          </div>
        ) : null}
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-[color:var(--color-ink-500)] hover:bg-rose-50 hover:text-[color:var(--color-danger-700)]"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

