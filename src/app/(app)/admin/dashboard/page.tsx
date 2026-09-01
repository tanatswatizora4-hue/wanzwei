import Link from "next/link";
import {
  Users,
  ShieldCheck,
  FileText,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, FacilityLogo } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sparkline } from "@/components/app/sparkline";
import { AppAreaChart } from "@/components/app/area-chart";
import { timeAgoLong } from "@/lib/format";
import { adminVerificationPath } from "@/lib/jobs/paths";
import { listVerifications } from "@/lib/repos/verifications";
import { listJobsWithFacility } from "@/lib/repos/jobs";
import { getAdminDashboardStats } from "@/lib/repos/dashboard-stats";
import { requireRole } from "@/lib/auth/session";

function formatCount(value: number): string {
  return value.toLocaleString("en");
}

export default async function AdminDashboardPage() {
  await requireRole(["admin"]);
  const [stats, verifications, recentJobs] = await Promise.all([
    getAdminDashboardStats(),
    listVerifications(5),
    listJobsWithFacility(6),
  ]);

  const kpis = [
    {
      label: "Professionals",
      value: formatCount(stats.professionalsCount),
      spark: stats.verifiedPros.spark,
      icon: <Users className="h-4 w-4" />,
      iconBg: "bg-violet-50 text-violet-600",
    },
    {
      label: "Verified professionals",
      value: formatCount(stats.verifiedPros.value),
      spark: stats.verifiedPros.spark,
      icon: <ShieldCheck className="h-4 w-4" />,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Unverified professionals",
      value: formatCount(stats.unverifiedProfessionalsCount),
      spark: stats.totalUsers.spark,
      icon: <Users className="h-4 w-4" />,
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      label: "Verification queue",
      value: formatCount(stats.pendingVerifications),
      spark: stats.totalUsers.spark,
      icon: <FileText className="h-4 w-4" />,
      iconBg: "bg-sky-50 text-sky-600",
    },
  ];

  const secondary = [
    { label: "Facilities", value: stats.facilitiesCount },
    { label: "Verified facilities", value: stats.verifiedFacilitiesCount },
    { label: "Unverified facilities", value: stats.unverifiedFacilitiesCount },
    { label: "Open jobs", value: stats.activeJobs.value },
    { label: "Applications", value: stats.totalApplications },
    { label: "Emergency alerts", value: stats.activeEmergencyAlerts },
    { label: "Under Review cases", value: stats.underReviewVerifications },
    { label: "Hires this month", value: stats.hiresMtd.value },
  ];

  const hasGrowthData = stats.growthChart.some(
    (row) => row.users > 0 || row.hires > 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform overview"
        description="Live counts from the database across professionals, facilities, jobs, and verification."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="card-hover">
            <CardBody className="pt-5">
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${k.iconBg}`}
                >
                  {k.icon}
                </div>
              </div>
              <p className="mt-4 text-[11.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold">
                {k.label}
              </p>
              <p className="mt-1 font-display num text-[26px] font-bold tracking-tight leading-none">
                {k.value}
              </p>
              <div className="mt-3 -mx-1">
                <Sparkline data={k.spark} positive />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {secondary.map((item) => (
          <Card key={item.label}>
            <CardBody className="py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                {item.label}
              </p>
              <p className="mt-1 font-display num text-[20px] font-bold tabular-nums">
                {formatCount(item.value)}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Growth</CardTitle>
              <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                New users vs. hires (last 8 months)
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {hasGrowthData ? (
              <AppAreaChart
                data={stats.growthChart}
                series={[
                  { key: "users", label: "Users", color: "#6f5ef0" },
                  { key: "hires", label: "Hires", color: "#10b981" },
                ]}
                height={260}
              />
            ) : (
              <p className="py-12 text-center text-[13px] text-[color:var(--color-ink-500)]">
                Not enough data for growth trends yet.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification queue</CardTitle>
            <Link
              href="/admin/verification"
              className="text-[12.5px] font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              Manage →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-[color:var(--color-border-default)]">
              {verifications.length === 0 ? (
                <li className="px-5 py-8 text-center text-[13px] text-[color:var(--color-ink-500)]">
                  No verification requests.
                </li>
              ) : (
                verifications.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={v.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={adminVerificationPath(v.id)}
                        className="truncate text-[13px] font-semibold hover:text-[color:var(--color-brand-700)]"
                      >
                        {v.name}
                      </Link>
                      <p className="truncate text-[11px] text-[color:var(--color-ink-500)]">
                        {v.profession} · {v.documentCount} docs
                      </p>
                    </div>
                    <StatusBadge status={v.status} />
                  </li>
                ))
              )}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent jobs</CardTitle>
          <Link
            href="/admin/jobs"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[color:var(--color-brand-600)] hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[13px] text-[color:var(--color-ink-500)]">
                    No jobs posted yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentJobs.map(({ job: j, facility: f }) => (
                  <TableRow key={j.id}>
                    <TableCell>
                      <p className="font-semibold text-[color:var(--color-ink-900)]">
                        {j.title}
                      </p>
                      <p className="text-[11px] text-[color:var(--color-ink-400)]">
                        {j.location}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FacilityLogo
                          initials={f.initials}
                          gradient={f.logoColor}
                          size={22}
                        />
                        <span>{f.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{j.applicants}</TableCell>
                    <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                      {timeAgoLong(j.postedAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={j.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
