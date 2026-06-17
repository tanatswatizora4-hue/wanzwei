import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { StatCard } from "@/components/app/stat-card";
import { JobRow } from "@/components/app/job-row";
import { EmergencyAlertsPanel } from "@/components/app/emergency-alerts";
import { ProfileCompletionBanner } from "@/components/app/profile-completion-banner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { FacilityLogo } from "@/components/ui/avatar";
import { requireRole } from "@/lib/auth/session";
import { timeAgoLong } from "@/lib/format";
import { listApplicationsForProfessional } from "@/lib/repos/applications";
import {
  listFacilitiesByIds,
  listTopHiringFacilities,
} from "@/lib/repos/facilities";
import { getActiveAlertsForProfessionalEmail } from "@/lib/repos/emergency-alerts";
import { listInterviewsForProfessional } from "@/lib/repos/interviews";
import { listOpenJobsWithFacilityForProfessional } from "@/lib/repos/jobs";
import { getProfessionalDashboardStats } from "@/lib/repos/dashboard-stats";

export default async function ProfessionalDashboardPage() {
  const user = await requireRole(["professional"]);

  const [
    stats,
    recommended,
    applications,
    topFacilities,
    interviews,
    emergencyAlerts,
  ] = await Promise.all([
    getProfessionalDashboardStats(user.id),
    listOpenJobsWithFacilityForProfessional(user.id, 5),
    listApplicationsForProfessional(user.email, 4),
    listTopHiringFacilities(5),
    listInterviewsForProfessional(user.email, 4),
    getActiveAlertsForProfessionalEmail(user.email),
  ]);

  const alertFacilities = await listFacilitiesByIds([
    ...new Set(emergencyAlerts.map((alert) => alert.facilityId)),
  ]);
  const alertFacilitiesById = Object.fromEntries(
    alertFacilities.map((facility) => [facility.id, facility]),
  );
  const nowMs = new Date().getTime();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight">
          Welcome back, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[color:var(--color-ink-500)]">
          Here&apos;s what&apos;s happening with your healthcare career.
        </p>
      </div>

      <EmergencyAlertsPanel
        alerts={emergencyAlerts}
        facilitiesById={alertFacilitiesById}
        nowMs={nowMs}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          accent="violet"
          label="Applications"
          value={stats.applications.value}
          delta={stats.applications.delta}
          deltaLabel={stats.applications.deltaLabel}
          trend={stats.applications.trend}
        />
        <StatCard
          accent="emerald"
          label="Interviews"
          value={stats.interviews.value}
          delta={stats.interviews.delta}
          deltaLabel={stats.interviews.deltaLabel}
          trend={stats.interviews.trend}
        />
        <StatCard
          accent="amber"
          label="Saved Jobs"
          value={stats.savedJobs.value}
          delta={stats.savedJobs.delta}
          deltaLabel={stats.savedJobs.deltaLabel}
          trend={stats.savedJobs.trend}
        />
        <StatCard
          accent="sky"
          label="CPD Credits"
          value={stats.cpdCredits.value}
          deltaLabel={stats.cpdCredits.deltaLabel}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Jobs</CardTitle>
              <Link
                href="/professional/jobs"
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[color:var(--color-brand-600)] hover:underline"
              >
                View all jobs <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <div className="px-2 pb-2">
              <ul className="flex flex-col">
                {recommended.length === 0 ? (
                  <li className="px-3 py-4 text-[13px] text-[color:var(--color-ink-500)]">
                    No open roles right now.
                  </li>
                ) : (
                  recommended.map(({ job, facility }) => (
                    <li key={job.id}>
                      <JobRow job={job} facility={facility} />
                    </li>
                  ))
                )}
              </ul>
              <div className="px-3 pt-2 pb-1">
                <Link
                  href="/professional/jobs"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[color:var(--color-brand-600)] hover:underline"
                >
                  Browse all jobs <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Card>

          <ProfileCompletionBanner href="/professional/profile" />

          <Card>
            <CardHeader>
              <CardTitle>Top Facilities Hiring</CardTitle>
              <Link
                href="/professional/jobs"
                className="text-[12.5px] font-medium text-[color:var(--color-brand-600)] hover:underline"
              >
                View all facilities →
              </Link>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {topFacilities.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-3.5 text-center"
                  >
                    <FacilityLogo
                      initials={f.initials}
                      gradient={f.logoColor}
                      size={40}
                      className="mx-auto"
                    />
                    <p className="mt-2 text-[12.5px] font-semibold truncate">
                      {f.name}
                    </p>
                    <p className="text-[11px] text-[color:var(--color-ink-400)]">
                      {f.openRoles} open roles
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <Link
                href="/professional/applications"
                className="text-[12.5px] font-medium text-[color:var(--color-brand-600)] hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <div className="px-2 pb-2">
              <ul className="flex flex-col">
                {applications.map(({ application: a, job, facility }) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-[color:var(--color-ink-900)]/[0.025]"
                  >
                    <FacilityLogo
                      initials={facility.initials}
                      gradient={facility.logoColor}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">
                        {job.title}
                      </p>
                      <p className="truncate text-[11.5px] text-[color:var(--color-ink-500)]">
                        {facility.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={a.status} />
                      <span className="text-[10.5px] text-[color:var(--color-ink-400)]">
                        {timeAgoLong(a.appliedAt)}
                      </span>
                    </div>
                  </li>
                ))}
                {applications.length === 0 ? (
                  <li className="px-3 py-4 text-[13px] text-[color:var(--color-ink-500)]">
                    No applications yet.
                  </li>
                ) : null}
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <Link
                href="#"
                className="text-[12.5px] font-medium text-[color:var(--color-brand-600)] hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <div className="px-2 pb-3">
              {interviews.length === 0 ? (
                <div className="px-3 py-4 text-[13px] text-[color:var(--color-ink-500)]">
                  No interviews scheduled.
                </div>
              ) : (
                <ul className="flex flex-col">
                  {interviews.map(({ interview: i, job, facility }) => {
                    const d = new Date(i.date);
                    const month = d
                      .toLocaleString("en", { month: "short" })
                      .toUpperCase();
                    const day = d.getDate();
                    const time = d.toLocaleTimeString("en", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });
                    return (
                      <li
                        key={i.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-[color:var(--color-ink-900)]/[0.025]"
                      >
                        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
                          <span className="text-[10px] font-medium leading-none">
                            {month}
                          </span>
                          <span className="text-[14px] font-semibold leading-none mt-0.5">
                            {day}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">
                            {job.title} Interview
                          </p>
                          <p className="truncate text-[11.5px] text-[color:var(--color-ink-500)]">
                            {facility.name}
                          </p>
                        </div>
                        <div className="text-[11.5px] text-[color:var(--color-ink-500)] flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {time}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
