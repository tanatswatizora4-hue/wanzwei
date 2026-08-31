import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
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
    <div className="relative flex min-h-screen">
      <MedicalBackground variant="app" />
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} unreadNotificationCount={unreadNotificationCount} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-6 fade-in">
            {user.role === "professional" && user.verified !== true ? (
              <ProfessionalVerificationBanner />
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
