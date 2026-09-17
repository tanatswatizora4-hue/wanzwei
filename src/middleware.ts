import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { parseWorkspaceCookie } from "@/lib/auth/workspace-model";
import { applyAuthCookies, updateSession } from "@/lib/supabase/middleware";
import { isEmailAuthConfirmed } from "@/lib/auth/signup-session";
import { WORKSPACE_COOKIE_NAME } from "@/lib/auth/workspace-model";

const PROTECTED_PREFIXES = [
  "/professional",
  "/facility",
  "/admin",
  "/workspaces",
  "/invitations",
] as const;

type AppRole = "professional" | "facility" | "admin";

function readRole(user: User): AppRole | null {
  // Signed session cache only. Never read user_metadata. Login/OAuth sync
  // this claim from public.users.role before the session continues.
  const candidate = (user.app_metadata as { role?: unknown } | undefined)?.role;
  if (
    candidate === "professional" ||
    candidate === "facility" ||
    candidate === "admin"
  ) {
    return candidate;
  }
  return null;
}

function dashboardForRole(role: AppRole | null): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "facility") return "/facility/dashboard";
  return "/professional/dashboard";
}

function dashboardForSession(
  role: AppRole | null,
  workspaceCookie: string | undefined,
): string {
  if (role === "admin") return "/admin/dashboard";
  const preference = parseWorkspaceCookie(workspaceCookie);
  if (preference?.type === "facility") return "/facility/dashboard";
  if (preference?.type === "professional") return "/professional/dashboard";
  return dashboardForRole(role);
}

/**
 * Middleware authenticates and keeps admin on /admin.
 * Professional vs facility prefixes are product workspaces: membership is
 * checked on the server for every action. A JWT role is not rewritten to
 * switch profiles.
 */
function mayAccessPath(role: AppRole, pathname: string): boolean {
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  if (role === "admin") return isAdminPath;
  if (isAdminPath) return false;
  return true;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public/auth/marketing routes must never wait on remote Auth. The matcher
  // already excludes them; this guard keeps a widened matcher from hanging
  // /login behind supabase.auth.getUser().
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(req);

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
    return applyAuthCookies(NextResponse.redirect(url), response);
  }

  if (!isEmailAuthConfirmed(user)) {
    const url = req.nextUrl.clone();
    url.pathname = "/signup/check-email";
    if (user.email) url.searchParams.set("email", user.email);
    return applyAuthCookies(NextResponse.redirect(url), response);
  }

  const role = readRole(user);

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "no_role");
    return applyAuthCookies(NextResponse.redirect(url), response);
  }

  if (!mayAccessPath(role, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = dashboardForSession(
      role,
      req.cookies.get(WORKSPACE_COOKIE_NAME)?.value,
    );
    return applyAuthCookies(NextResponse.redirect(url), response);
  }

  return response;
}

export const config = {
  // Allowlist only. Do not add /login, /signup, /auth, marketing pages,
  // static assets, or Next internals — those must render without Auth.
  matcher: [
    "/professional/:path*",
    "/facility/:path*",
    "/admin/:path*",
    "/workspaces/:path*",
    "/invitations/:path*",
  ],
};
