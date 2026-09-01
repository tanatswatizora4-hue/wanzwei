import { Bell } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgoLong } from "@/lib/format";
import { requireRole } from "@/lib/auth/session";
import { getNotificationsForUserEmail } from "@/lib/repos/notifications";
import { ShieldCheck, Sparkles, FileText } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  match: <Sparkles className="h-4 w-4" />,
  application: <FileText className="h-4 w-4" />,
  verification: <ShieldCheck className="h-4 w-4" />,
  system: <Bell className="h-4 w-4" />,
};

const TONE: Record<string, string> = {
  match: "bg-violet-50 text-violet-700",
  application: "bg-sky-50 text-sky-700",
  verification: "bg-emerald-50 text-emerald-700",
  system: "bg-slate-100 text-slate-700",
};

export default async function NotificationsPage() {
  const user = await requireRole(["professional"]);
  const notifications = await getNotificationsForUserEmail(user.email);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="In-app alerts for applications, verification, and locum activity."
      />

      <Card>
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-4 w-4" />}
            title="No notifications yet"
            description="Watch My Applications and your verification status in the product. Alerts appear here when they are generated."
          />
        ) : (
          <ul className="divide-y divide-[color:var(--color-border-default)]">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-5 py-4 ${n.unread ? "bg-[color:var(--color-brand-50)]/40" : ""}`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${TONE[n.kind] ?? TONE.system}`}
                >
                  {ICONS[n.kind] ?? <Bell className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-semibold">{n.title}</p>
                    {n.unread ? (
                      <span className="size-1.5 rounded-full bg-[color:var(--color-brand-600)]" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-500)]">
                    {n.body}
                  </p>
                </div>
                <span className="text-[11px] text-[color:var(--color-ink-400)] whitespace-nowrap">
                  {timeAgoLong(n.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
