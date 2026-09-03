import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { applyAuthCookies, updateSession } from "@/lib/supabase/middleware";
import { isEmailAuthConfirmed } from "@/lib/auth/signup-session";

const PROTECTED_PREFIXES = ["/professional", "/facility", "/admin"] as const;

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

function rolePrefix(role: AppRole | null): string | null {
  if (role === "admin") return "/admin";
  if (role === "facility") return "/facility";
  if (role === "professional") return "/professional";
  return null;
}

function dashboardForRole(role: AppRole | null): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "facility") return "/facility/dashboard";
  return "/professional/dashboard";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { response, user } = await updateSession(req);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isProtected) {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return applyAuthCookies(NextResponse.redirect(url), response);
    }

    if (!isEmailAuthConfirmed(user)) {
      const url = req.nextUrl.clone();
      url.pathname = "/signup/check-email";
      if (user.email) url.searchParams.set("email", user.email);
      return applyAuthCookies(NextResponse.redirect(url), response);
    }

    const role = readRole(user);
    const expected = rolePrefix(role);

    if (!expected) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "no_role");
      return applyAuthCookies(NextResponse.redirect(url), response);
    }

    if (!pathname.startsWith(expected)) {
      const url = req.nextUrl.clone();
      url.pathname = `${expected}/dashboard`;
      return applyAuthCookies(NextResponse.redirect(url), response);
    }
  }

  if ((pathname === "/login" || pathname === "/signup") && user) {
    if (!isEmailAuthConfirmed(user)) {
      const url = req.nextUrl.clone();
      url.pathname = "/signup/check-email";
      if (user.email) url.searchParams.set("email", user.email);
      return applyAuthCookies(NextResponse.redirect(url), response);
    }
    const url = req.nextUrl.clone();
    url.pathname = dashboardForRole(readRole(user));
    return applyAuthCookies(NextResponse.redirect(url), response);
  }

  return response;
}

export const config = {
  matcher: [
    "/professional/:path*",
    "/facility/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
