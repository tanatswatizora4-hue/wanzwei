import {
  Siren,
  Zap,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
  Sparkles,
  Crown,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { requireRole } from "@/lib/auth/session";
import { getEmergencyAlertsForFacility } from "@/lib/repos/emergency-alerts";
import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import { timeAgoLong } from "@/lib/format";
import { EmergencyAlertForm } from "./emergency-form";
import { cancelAlertAction } from "./actions";

const ALERTS_INCLUDED = 5;

export default async function FacilityEmergencyPage() {
  const user = await requireRole(["facility"]);
  const facility = await findFacilityForUserEmail(user.email);
  const alerts = facility ? await getEmergencyAlertsForFacility(facility.id) : [];

  const used = alerts.length;
  const remaining = Math.max(0, ALERTS_INCLUDED - used);
  const usedPct = Math.min(100, Math.round((used / ALERTS_INCLUDED) * 100));

  const stats = {
    total: alerts.length,
    sent: alerts.filter((a) => a.status === "Sent").length,
    filled: alerts.filter((a) => a.status === "Filled").length,
    expired: alerts.filter(
      (a) => a.status === "Expired" || a.status === "Cancelled",
    ).length,
    fillRate:
      alerts.length === 0
        ? 0
        : Math.round(
            (alerts.filter((a) => a.status === "Filled").length /
              alerts.length) *
              100,
          ),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Emergency Locum Alerts"
        meta={
          <Badge tone="brand">
            <Crown className="h-3 w-3" />
            Premium feature
          </Badge>
        }
        description={`Push an urgent shift to verified ${facility?.location ?? "local"} professionals in under 60 seconds.`}
      />

      <PricingBanner used={used} remaining={remaining} usedPct={usedPct} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat
          icon={<Siren className="h-3.5 w-3.5" />}
          label="Total alerts"
          value={stats.total}
          accent="violet"
        />
        <MiniStat
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Active now"
          value={stats.sent}
          accent="amber"
        />
        <MiniStat
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Filled"
          value={stats.filled}
          accent="emerald"
        />
        <MiniStat
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Fill rate"
          value={`${stats.fillRate}%`}
          accent="sky"
        />
      </div>

      <EmergencyAlertForm defaultLocation={facility?.location ?? "Harare"} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold tracking-tight">
            Recent alerts
          </h2>
          <p className="text-[12px] text-[color:var(--color-ink-500)]">
            {stats.total} total
          </p>
        </div>

        {alerts.length === 0 ? (
          <Card>
            <CardBody className="py-10 text-center">
              <p className="text-[13.5px] text-[color:var(--color-ink-500)]">
                No emergency alerts yet. Send your first one above.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {alerts.map((a) => (
              <AlertListItem key={a.id} alert={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PricingBanner({
  used,
  remaining,
  usedPct,
}: {
  used: number;
  remaining: number;
  usedPct: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-white">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(110deg, rgba(111,94,240,0.10) 0%, rgba(244,114,182,0.08) 55%, transparent 100%)",
        }}
      />
      <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-x-4">
        {/* Left: logo + copy */}
        <div className="flex items-center gap-3 min-w-0 md:justify-self-start">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white shadow-[0_6px_16px_-6px_rgba(99,102,241,0.55)]"
            style={{
              background:
                "linear-gradient(135deg, #ff8aae 0%, #b274ff 60%, #6366f1 100%)",
            }}
          >
            <Siren className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-display text-[14.5px] font-semibold tracking-tight">
                Emergency Alerts
              </p>
              <Badge tone="warn" className="shrink-0">
                <Sparkles className="h-3 w-3" /> Premium
              </Badge>
            </div>
            <p className="text-[11.5px] text-[color:var(--color-ink-500)]">
              <span className="num font-semibold text-[color:var(--color-ink-700)] tabular-nums">
                $25
              </span>{" "}
              / alert · 5 free on Pro · unlimited on Scale
            </p>
          </div>
        </div>

        {/* Center: remaining — visually anchored to middle column */}
        <div className="flex flex-col items-center justify-center text-center md:justify-self-center md:px-2">
          <p className="font-display num text-[28px] font-bold tracking-tight tabular-nums leading-none text-[color:var(--color-ink-900)]">
            {remaining}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-ink-400)] font-semibold">
            alerts left
          </p>
        </div>

        {/* Right: allowance + upgrade */}
        <div className="flex flex-wrap items-center justify-center gap-3 min-w-0 md:justify-self-end md:justify-end">
          <div className="hidden sm:block min-w-0">
            <p className="text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold whitespace-nowrap">
              Allowance
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-28 max-w-[min(100%,9rem)] overflow-hidden rounded-full bg-[color:var(--color-ink-900)]/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <span className="font-display num text-[12px] font-semibold tabular-nums whitespace-nowrap">
                {used} / {used + remaining}
              </span>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0">
            Upgrade
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "violet" | "amber" | "emerald" | "sky";
}) {
  const colorMap = {
    violet: "text-violet-600 bg-violet-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
    sky: "text-sky-600 bg-sky-50",
  };
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardBody className="flex min-w-0 items-center gap-3 py-3">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${colorMap[accent]}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-500)]">
            {label}
          </p>
          <p className="font-display num text-[18px] font-bold tracking-tight leading-tight tabular-nums">
            {value}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function AlertListItem({
  alert,
}: {
  alert: import("@/lib/types").EmergencyAlert;
}) {
  const accepted = alert.recipients.filter((r) => r.status === "Accepted");
  const declined = alert.recipients.filter((r) => r.status === "Declined");
  const pending = alert.recipients.filter((r) => r.status === "Pending");
  const expired = alert.recipients.filter((r) => r.status === "Expired");

  const urgencyClass =
    alert.urgency === "Critical"
      ? "from-rose-500 to-pink-600"
      : alert.urgency === "High"
        ? "from-amber-500 to-orange-600"
        : "from-sky-500 to-indigo-500";

  return (
    <article className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)]/60 px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex h-6 items-center gap-1 rounded-full bg-gradient-to-r ${urgencyClass} px-2 text-[10.5px] font-semibold uppercase tracking-wider text-white shrink-0`}
          >
            <Siren className="h-3 w-3" />
            {alert.urgency}
          </span>
          <span className="font-display text-[14px] font-semibold tracking-tight truncate">
            {alert.profession}
          </span>
          <span className="text-[color:var(--color-ink-300)] shrink-0">·</span>
          <span className="inline-flex items-center gap-1 text-[12px] text-[color:var(--color-ink-500)] truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {alert.location}
          </span>
        </div>
        <StatusBadge status={alert.status} />
      </div>

      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
          <span className="inline-flex items-center gap-1.5 text-[color:var(--color-ink-700)]">
            <Clock className="h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
            <span className="font-medium">
              {new Date(alert.shiftStart).toLocaleString("en", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </span>
          <span className="text-[color:var(--color-ink-300)]">→</span>
          <span className="text-[color:var(--color-ink-500)]">
            {new Date(alert.shiftEnd).toLocaleTimeString("en", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 num tabular-nums font-semibold text-[color:var(--color-ink-900)]">
            <DollarSign className="h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
            {alert.payMin}–{alert.payMax} {alert.payCurrency}
            <span className="font-normal text-[color:var(--color-ink-400)]">
              / {alert.payPeriod}
            </span>
          </span>
        </div>

        {alert.notes ? (
          <p className="text-[12.5px] leading-relaxed text-[color:var(--color-ink-500)] line-clamp-2">
            {alert.notes}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-surface-muted)] border border-[color:var(--color-border-default)] px-2 py-0.5 text-[11px] text-[color:var(--color-ink-700)]">
            <Users className="h-3 w-3" />
            <span className="num font-semibold tabular-nums">
              {alert.matchedCount}
            </span>{" "}
            sent
          </span>
          <Pill
            icon={<CheckCircle2 className="h-3 w-3" />}
            tone="emerald"
            n={accepted.length}
            label="accepted"
          />
          <Pill
            icon={<XCircle className="h-3 w-3" />}
            tone="rose"
            n={declined.length}
            label="declined"
          />
          <Pill
            icon={<Clock className="h-3 w-3" />}
            tone="amber"
            n={pending.length}
            label="pending"
          />
          <Pill
            icon={<AlertTriangle className="h-3 w-3" />}
            tone="slate"
            n={expired.length}
            label="expired"
          />
          <span className="ml-auto text-[11px] text-[color:var(--color-ink-400)]">
            {timeAgoLong(alert.createdAt)}
          </span>
        </div>

        {accepted.length > 0 ? (
          <div className="flex items-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50/60 px-3 py-2">
            <Avatar name={accepted[0].professionalName} size={26} />
            <div className="min-w-0 leading-tight">
              <p className="text-[12.5px] font-semibold text-emerald-800">
                {accepted[0].professionalName} accepted
              </p>
              <p className="text-[11px] text-emerald-700/80">
                {accepted[0].respondedAt
                  ? timeAgoLong(accepted[0].respondedAt)
                  : ""}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto">
              Message
            </Button>
          </div>
        ) : null}

        {alert.status === "Sent" ? (
          <form action={cancelAlertAction} className="mt-1 flex justify-end">
            <input type="hidden" name="alertId" value={alert.id} />
            <Button variant="ghost" size="sm" type="submit">
              Cancel alert
            </Button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function Pill({
  icon,
  tone,
  n,
  label,
}: {
  icon: React.ReactNode;
  tone: "emerald" | "rose" | "amber" | "slate";
  n: number;
  label: string;
}) {
  const cls = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    rose: "text-rose-700 bg-rose-50 border-rose-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    slate: "text-slate-600 bg-slate-50 border-slate-200",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${cls}`}
    >
      {icon}
      <span className="num font-semibold tabular-nums">{n}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}
