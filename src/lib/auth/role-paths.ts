import type { Role } from "@/lib/types";

import { postAuthNextPath } from "@/lib/auth/callback-params";

export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "facility":
      return "/facility/dashboard";
    case "professional":
    default:
      return "/professional/dashboard";
  }
}

export function pathnameFromNext(next: string): string {
  const path = next.split("?")[0] ?? next;
  return path.length > 0 ? path : "/";
}

/**
 * A `next` path is honoured only when this role is allowed to open it.
 * Forbidden role routes are not used as a bounce step after login.
 */
export function pathAllowedForRole(role: Role, next: string): boolean {
  const pathname = pathnameFromNext(next);
  if (pathname === "/reset-password") return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return role === "admin";
  }
  if (pathname === "/facility" || pathname.startsWith("/facility/")) {
    return role === "facility";
  }
  if (pathname === "/professional" || pathname.startsWith("/professional/")) {
    return role === "professional";
  }
  return false;
}

export function authorizedPostAuthPath(
  next: string | null | undefined,
  role: Role,
): string {
  const dashboard = dashboardPathForRole(role);
  const candidate = postAuthNextPath(next, dashboard);
  if (candidate === dashboard) return dashboard;
  if (pathAllowedForRole(role, candidate)) return candidate;
  return dashboard;
}

export function loginErrorForProvisionFailure(
  code: "no_role" | "db_not_configured" | "profile_unavailable" | "account_closed",
): "no_role" | "db_not_configured" | "profile_missing" | "account_closed" {
  if (code === "no_role") return "no_role";
  if (code === "db_not_configured") return "db_not_configured";
  if (code === "account_closed") return "account_closed";
  return "profile_missing";
}
