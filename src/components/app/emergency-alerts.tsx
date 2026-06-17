import {
  Siren,
  Clock,
  MapPin,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FacilityLogo } from "@/components/ui/avatar";
import { timeAgoLong } from "@/lib/format";
import type { EmergencyAlert, Facility } from "@/lib/types";
import { EmergencyAlertRespondButtons } from "@/components/app/emergency-alert-respond-buttons";

export function EmergencyAlertsPanel({
  alerts,
  facilitiesById = {},
  nowMs,
}: {
  alerts: EmergencyAlert[];
  facilitiesById?: Record<string, Facility>;
  nowMs?: number;
}) {
  if (alerts.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-[0_4px_16px_-4px_rgba(244,63,94,0.4)]">
            <Siren className="h-3.5 w-3.5" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-white animate-pulse" />
          </span>
          <div className="leading-tight">
            <h2 className="font-display text-[16px] font-semibold tracking-tight">
              Emergency Alerts
            </h2>
            <p className="text-[11.5px] text-[color:var(--color-ink-500)]">
              Urgent shifts from verified facilities — first to accept wins.
            </p>
          </div>
        </div>
        <Badge tone="danger">
          {alerts.length} active
        </Badge>
      </div>

      <div className="flex flex-col gap-3">
        {alerts.map((a) => (
          <EmergencyAlertCard
            key={a.id}
            alert={a}
            facility={facilitiesById[a.facilityId]}
            nowMs={nowMs}
          />
        ))}
      </div>
    </section>
  );
}

function EmergencyAlertCard({
  alert,
  facility,
  nowMs,
}: {
  alert: EmergencyAlert;
  facility?: Facility;
  nowMs?: number;
}) {
  const f = facility;
  const createdAtMs = new Date(alert.createdAt).getTime();
  const expiresAtMs = new Date(alert.expiresAt).getTime();
  const minutesLeft = Math.max(
    0,
    Math.round((expiresAtMs - (nowMs ?? createdAtMs)) / 60000),
  );
  const totalWindow = Math.max(
    1,
    Math.round((expiresAtMs - createdAtMs) / 60000),
  );
  const pct = Math.max(
    0,
    Math.min(100, Math.round((minutesLeft / totalWindow) * 100)),
  );

  const urgencyBg =
    alert.urgency === "Critical"
      ? "from-rose-500 to-pink-600"
      : alert.urgency === "High"
        ? "from-amber-500 to-orange-600"
        : "from-sky-500 to-indigo-500";

  const expiresLabel =
    minutesLeft >= 60
      ? `${Math.round(minutesLeft / 60)}h left`
      : `${minutesLeft}m left`;

  return (
    <article className="card relative overflow-hidden">
      {/* Left urgency stripe */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${urgencyBg}`}
      />

      {/* Header */}
      <header className="flex items-start gap-3 px-5 pt-4 pb-3">
        {f ? (
          <FacilityLogo
            initials={f.initials}
            gradient={f.logoColor}
            size={40}
            className="rounded-[10px]"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-[15.5px] font-semibold tracking-tight truncate">
              {alert.profession}
            </h3>
            <span
              className={`inline-flex h-5 items-center gap-1 rounded-full bg-gradient-to-r ${urgencyBg} px-1.5 text-[10px] font-semibold uppercase tracking-wider text-white`}
            >
              <Siren className="h-2.5 w-2.5" />
              {alert.urgency}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-500)] truncate">
            {f?.name ?? "Facility"} · {alert.location}
          </p>
        </div>
        <div className="text-right shrink-0 leading-tight">
          <p
            className={`font-display num text-[14px] font-bold tabular-nums ${
              minutesLeft <= 15
                ? "text-rose-600"
                : "text-[color:var(--color-ink-900)]"
            }`}
          >
            {expiresLabel}
          </p>
          <p className="text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold">
            to respond
          </p>
        </div>
      </header>

      {/* Meta + countdown bar */}
      <div className="mx-5 mb-3 rounded-[10px] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)]/70 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
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
            <span className="text-[color:var(--color-ink-400)]">
              →{" "}
              {new Date(alert.shiftEnd).toLocaleTimeString("en", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </span>
          <span className="h-3 w-px bg-[color:var(--color-border-default)]" />
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
            <span className="font-medium text-[color:var(--color-ink-700)]">
              {alert.location}
            </span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 num tabular-nums font-bold text-[color:var(--color-ink-900)]">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            {alert.payMin}–{alert.payMax} {alert.payCurrency}
            <span className="font-normal text-[color:var(--color-ink-400)]">
              / {alert.payPeriod}
            </span>
          </span>
        </div>

        {/* Countdown bar */}
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-ink-900)]/[0.06]">
          <div
            className={`h-full rounded-full transition-all ${
              pct <= 25
                ? "bg-rose-500"
                : pct <= 50
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Notes */}
      {alert.notes ? (
        <p className="px-5 pb-3 text-[12.5px] leading-relaxed text-[color:var(--color-ink-500)] line-clamp-2">
          {alert.notes}
        </p>
      ) : null}

      {/* Action bar */}
      <footer className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)]/50 px-5 py-2.5">
        <p className="text-[11px] text-[color:var(--color-ink-400)]">
          Pushed {timeAgoLong(alert.createdAt)}
        </p>
        <EmergencyAlertRespondButtons alertId={alert.id} />
      </footer>
    </article>
  );
}
