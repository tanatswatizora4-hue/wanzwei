import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Briefcase,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, FacilityLogo } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
      label: "Total users",
      value: formatCount(stats.totalUsers.value),
      delta: stats.totalUsers.delta,
      spark: stats.totalUsers.spark,
      icon: <Users className="h-4 w-4" />,
      iconBg: "bg-violet-50 text-violet-600",
    },
    {
      label: "Verified pros",
      value: formatCount(stats.verifiedPros.value),
      delta: stats.verifiedPros.delta,
      spark: stats.verifiedPros.spark,
      icon: <ShieldCheck className="h-4 w-4" />,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Active jobs",
      value: formatCount(stats.activeJobs.value),
      delta: stats.activeJobs.delta,
      spark: stats.activeJobs.spark,
      icon: <Briefcase className="h-4 w-4" />,
      iconBg: "bg-sky-50 text-sky-600",
    },
    {
      label: "Hires MTD",
      value: formatCount(stats.hiresMtd.value),
      delta: stats.hiresMtd.delta,
      spark: stats.hiresMtd.spark,
      icon: <Sparkles className="h-4 w-4" />,
      iconBg: "bg-amber-50 text-amber-600",
    },
  ];

  const hasGrowthData = stats.growthChart.some(
    (row) => row.users > 0 || row.hires > 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform overview"
        description="Real-time signals across users, verification, hiring and matching."
        actions={
          <Button variant="secondary" size="sm" disabled title="Export coming soon">
            Export report
          </Button>
        }
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
                {k.delta !== undefined ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${k.delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                  >
                    {k.delta >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(k.delta)}%
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-[11.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold">
                {k.label}
              </p>
              <p className="mt-1 font-display num text-[26px] font-bold tracking-tight leading-none">
                {k.value}
              </p>
              <div className="mt-3 -mx-1">
                <Sparkline
                  data={k.spark}
                  positive={(k.delta ?? 0) >= 0}
                />
              </div>
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
            <div className="flex items-center gap-4 text-[11.5px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[color:var(--color-brand-500)]" />
                Users
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Hires
              </span>
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
                <li
                  key={v.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <Avatar name={v.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {v.name}
                    </p>
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
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[13px] text-[color:var(--color-ink-500)]">
                    No jobs posted yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentJobs.map(({ job: j, facility: f }) => {
                return (
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
