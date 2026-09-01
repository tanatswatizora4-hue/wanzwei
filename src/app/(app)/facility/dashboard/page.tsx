import Link from "next/link";
import {
  Star,
  Eye,
  Pencil,
  ArrowRight,
  Plus,
  Siren,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import { FacilityVerifiedBadge } from "@/components/app/facility-verified-badge";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FacilityLogo, Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { timeAgoLong } from "@/lib/format";
import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import { getFacilityDashboardStats } from "@/lib/repos/dashboard-stats";
import { listJobsForFacility } from "@/lib/repos/jobs";

export default async function FacilityDashboardPage() {
  const user = await requireRole(["facility"]);
  const facility = await findFacilityForUserEmail(user.email);
  const [stats, recentJobs] = await Promise.all([
    facility
      ? getFacilityDashboardStats(facility.id)
      : Promise.resolve(null),
    facility ? listJobsForFacility(facility.id, 6) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}.`}
        description="Here's what's happening with your hiring this week."
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/facility/profile">
                <Eye className="h-3.5 w-3.5" /> View public profile
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/facility/settings">
                <Pencil className="h-3.5 w-3.5" /> Edit profile
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardBody className="pt-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <FacilityLogo
                initials={facility?.initials ?? "FA"}
                gradient={facility?.logoColor ?? "from-slate-400 to-slate-600"}
                size={56}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[18px] font-semibold tracking-tight">
                    {facility?.name ?? "Facility profile pending"}
                  </h2>
                  <FacilityVerifiedBadge verified={facility?.verified === true} />
                  <Badge tone="brand">Pro plan</Badge>
                </div>
                <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                  {facility ? `${facility.type} · ${facility.location}` : "Link your facility profile"}
                </p>
                <div className="mt-1 flex items-center gap-3 text-[12px] text-[color:var(--color-ink-500)]">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {facility?.rating ?? "—"} rating
                  </span>
                  <span>{facility?.openRoles ?? 0} open roles</span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          accent="violet"
          label="Active postings"
          value={stats?.openJobs.value ?? 0}
          delta={stats?.openJobs.delta}
          deltaLabel={stats?.openJobs.deltaLabel}
          trend={stats?.openJobs.trend}
        />
        <StatCard
          accent="emerald"
          label="New applicants"
          value={stats?.totalApplicants.value ?? 0}
          delta={stats?.totalApplicants.delta}
          deltaLabel={stats?.totalApplicants.deltaLabel}
          trend={stats?.totalApplicants.trend}
        />
        <StatCard
          accent="amber"
          label="Interviews scheduled"
          value={stats?.interviewsScheduled.value ?? 0}
          delta={stats?.interviewsScheduled.delta}
          deltaLabel={stats?.interviewsScheduled.deltaLabel}
          trend={stats?.interviewsScheduled.trend}
        />
        <StatCard
          accent="sky"
          label="Hires this month"
          value={stats?.hiresThisMonth.value ?? 0}
          delta={stats?.hiresThisMonth.delta}
          deltaLabel={stats?.hiresThisMonth.deltaLabel ?? "this month"}
          trend={stats?.hiresThisMonth.trend}
        />
      </div>

      {/* Emergency Locum Alert CTA */}
      <Link
        href="/facility/emergency"
        className="group relative block overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-white card-hover"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(110deg, rgba(244,63,94,0.10) 0%, rgba(168,85,247,0.10) 60%, transparent 95%)",
          }}
        />
        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,0.45)]"
            style={{
              background:
                "linear-gradient(135deg, #fb7185 0%, #e11d48 60%, #a21caf 100%)",
            }}
          >
            <Siren className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-display text-[15.5px] font-semibold tracking-tight">
                Need someone urgently?
              </p>
              <Badge tone="warn">
                <Zap className="h-3 w-3" /> Premium
              </Badge>
            </div>
            <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
              Push an Emergency Locum Alert to verified, available
              professionals — most shifts fill in under 30 minutes.
            </p>
          </div>
          <Button size="sm" className="shrink-0">
            Send alert
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Button>
        </div>
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Post a new role</CardTitle>
              <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-500)]">
                Use the job composer to publish a role to verified professionals.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-500)]">
              Role title, type, location, pay, and description are collected on
              the jobs page so every posting uses the same validated create flow.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/facility/jobs?new=1">
                  <Plus className="h-3.5 w-3.5" /> Post a role
                </Link>
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hiring pipeline</CardTitle>
            <Link
              href="/facility/applications"
              className="text-[12.5px] font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              Manage applicants →
            </Link>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(6.75rem,1fr))] gap-2">
              {(stats?.applicationPipeline ?? []).map((p) => (
                <div
                  key={p.label}
                  className="min-w-0 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-3 text-center"
                >
                  <p className="break-words text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)]">
                    {p.label}
                  </p>
                  <p className="mt-1 text-[20px] font-semibold tracking-tight">
                    {p.value}
                  </p>
                  <Badge tone={p.tone} className="mt-1.5">
                    {p.tone === "emerald" ? "active" : p.tone === "slate" ? "archived" : "active"}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] p-3.5">
              {stats?.avgDaysToHire != null ? (
                <>
                  <p className="text-[12.5px] font-semibold">
                    Avg. days to hire:{" "}
                    <span className="text-[color:var(--color-brand-700)]">
                      {stats.avgDaysToHire} days
                    </span>
                  </p>
                  <p className="mt-1 text-[11.5px] text-[color:var(--color-ink-500)]">
                    Based on hired applications at your facility.
                  </p>
                </>
              ) : (
                <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                  Not enough data to calculate average days to hire.
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent postings</CardTitle>
          <Link
            href="/facility/jobs"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[color:var(--color-brand-600)] hover:underline"
          >
            Manage all jobs <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[13px] text-[color:var(--color-ink-500)]">
                    No job postings yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <p className="font-semibold text-[color:var(--color-ink-900)]">
                      {job.title}
                    </p>
                    <p className="text-[11px] text-[color:var(--color-ink-400)]">
                      {job.location}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge tone="slate">{job.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {["AB", "CD", "EF"].map((i, ix) => (
                          <Avatar
                            key={ix}
                            name={i}
                            size={20}
                            className="ring-2 ring-white"
                            gradient="bg-gradient-to-br from-slate-400 to-slate-600"
                          />
                        ))}
                      </div>
                      <span className="text-[12.5px] tabular-nums">
                        {job.applicants}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    {timeAgoLong(job.postedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Manage
                    </Button>
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
