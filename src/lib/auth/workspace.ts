import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { dashboardPathForRole } from "@/lib/auth/role-paths";
import {
  type AccountMembership,
  type ActiveWorkspace,
  type WorkspacePreference,
  WORKSPACE_COOKIE_NAME,
  dashboardPathForWorkspace,
  parseWorkspaceCookie,
  resolveActiveWorkspace,
  serializeWorkspaceCookie,
  switcherProfiles,
  userCanAccessRole,
} from "@/lib/auth/workspace-model";
import { listMembershipsForUser } from "@/lib/repos/account-memberships";
import type { Role, User } from "@/lib/types";

export const workspaceCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 180,
};

export const listCachedMembershipsForUser = cache(listMembershipsForUser);

export async function readWorkspacePreference(): Promise<WorkspacePreference | null> {
  const jar = await cookies();
  return parseWorkspaceCookie(jar.get(WORKSPACE_COOKIE_NAME)?.value);
}

export async function persistWorkspacePreference(
  preference: WorkspacePreference,
): Promise<void> {
  const jar = await cookies();
  jar.set(
    WORKSPACE_COOKIE_NAME,
    serializeWorkspaceCookie(preference),
    workspaceCookieOptions,
  );
}

export async function clearWorkspacePreference(): Promise<void> {
  const jar = await cookies();
  jar.delete(WORKSPACE_COOKIE_NAME);
}

const resolveWorkspaceForUserId = cache(async function resolveWorkspaceForUserId(
  userId: string,
  signupRole: Role,
): Promise<{
  memberships: AccountMembership[];
  workspace: ActiveWorkspace | null;
  rejectedTamperedPreference: boolean;
}> {
  const memberships = await listCachedMembershipsForUser(userId);
  const preference = await readWorkspacePreference();
  const resolved = resolveActiveWorkspace({
    preference,
    memberships,
    signupRole,
    userId,
  });
  return { memberships, ...resolved };
});

/**
 * Active workspace for this request. Per-request `cache()` keyed by user id
 * and signup role, so layout/page callers share one cookie + membership
 * resolution. Cookies are still read from the current request; this is not
 * a cross-request cache.
 */
export async function resolveWorkspaceForUser(user: User): Promise<{
  memberships: AccountMembership[];
  workspace: ActiveWorkspace | null;
  rejectedTamperedPreference: boolean;
}> {
  return resolveWorkspaceForUserId(user.id, user.role);
}

export function dashboardForUserWorkspace(
  user: User,
  workspace: ActiveWorkspace | null,
): string {
  return dashboardPathForWorkspace(workspace, user.role);
}

export function fallbackDashboard(user: User): string {
  return dashboardPathForRole(user.role);
}

export async function userHasProductRole(
  user: User,
  allowed: Role[],
): Promise<boolean> {
  if (allowed.includes(user.role)) return true;
  const memberships = await listCachedMembershipsForUser(user.id);
  return userCanAccessRole(user.role, allowed, memberships);
}

export async function switcherForUser(user: User) {
  const memberships = await listCachedMembershipsForUser(user.id);
  return switcherProfiles({
    userId: user.id,
    userName: user.name,
    memberships,
  });
}

export { WORKSPACE_COOKIE_NAME };
