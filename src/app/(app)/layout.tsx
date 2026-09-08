import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { MedicalBackground } from "@/components/app/medical-background";
import { getCurrentUser } from "@/lib/auth/session";
import {
  resolveWorkspaceForUser,
  switcherForUser,
} from "@/lib/auth/workspace";
import { serializeWorkspaceCookie } from "@/lib/auth/workspace-model";
import { countUnreadNotificationsForUser } from "@/lib/repos/notifications";
import { ProfessionalVerificationBanner } from "@/components/app/professional-verification-banner";
import type { Role } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { workspace } = await resolveWorkspaceForUser(user);
  const navRole: Role =
    user.role === "admin"
      ? "admin"
      : workspace?.type === "facility"
        ? "facility"
        : workspace?.type === "professional"
          ? "professional"
          : user.role;

  const profiles = user.role === "admin" ? [] : await switcherForUser(user);
  const activeWorkspaceKey =
    user.role === "admin"
      ? "admin"
      : workspace?.type === "facility"
        ? serializeWorkspaceCookie({
            type: "facility",
            facilityId: workspace.facilityId,
          })
        : "professional";

  const unreadNotificationCount =
    navRole === "professional"
      ? await countUnreadNotificationsForUser(user.id)
      : 0;

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <MedicalBackground variant="app" />
      <AppShell
        user={user}
        navRole={navRole}
        unreadNotificationCount={unreadNotificationCount}
        switcherProfiles={profiles}
        activeWorkspaceKey={activeWorkspaceKey}
      >
        <div className="mx-auto w-full max-w-[1280px] px-4 py-4 fade-in sm:px-6 sm:py-6">
          {navRole === "professional" && user.verified !== true ? (
            <ProfessionalVerificationBanner />
          ) : null}
          {children}
        </div>
      </AppShell>
    </div>
  );
}
