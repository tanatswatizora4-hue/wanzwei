import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { MedicalBackground } from "@/components/app/medical-background";
import { getCurrentUser } from "@/lib/auth/session";
import { countUnreadNotificationsForUser } from "@/lib/repos/notifications";
import { ProfessionalVerificationBanner } from "@/components/app/professional-verification-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const unreadNotificationCount =
    user.role === "professional"
      ? await countUnreadNotificationsForUser(user.id)
      : 0;

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <MedicalBackground variant="app" />
      <AppShell user={user} unreadNotificationCount={unreadNotificationCount}>
        <div className="mx-auto w-full max-w-[1280px] px-4 py-4 fade-in sm:px-6 sm:py-6">
          {user.role === "professional" && user.verified !== true ? (
            <ProfessionalVerificationBanner />
          ) : null}
          {children}
        </div>
      </AppShell>
    </div>
  );
}
