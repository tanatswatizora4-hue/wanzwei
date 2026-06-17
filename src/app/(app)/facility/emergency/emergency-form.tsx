"use client";

import * as React from "react";
import {
  Siren,
  ShieldCheck,
  Zap,
  TriangleAlert,
  Flame,
  Clock,
  CalendarClock,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedRadio } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { createAlertAction } from "./actions";

const PROFESSIONS = [
  "Registered Nurse",
  "Theatre Nurse",
  "ICU Nurse",
  "Clinical Officer",
  "Pharmacist",
  "Radiographer",
  "Medical Laboratory Scientist",
];

const LOCATIONS = ["Harare", "Bulawayo", "Mutare", "Gweru", "Any"];

export function EmergencyAlertForm({
  defaultLocation = "Harare",
}: {
  defaultLocation?: string;
}) {
  // Sensible default shift window: next full hour → 12h shift after that
  const [shiftStart, setShiftStart] = React.useState(() =>
    toLocalInput(roundUpToNextHour(new Date())),
  );
  const [shiftEnd, setShiftEnd] = React.useState(() =>
    toLocalInput(addHours(roundUpToNextHour(new Date()), 12)),
  );

  return (
    <Card className="overflow-x-hidden">
      <CardHeader className="pb-2">
        <div>
          <CardTitle>Send emergency alert</CardTitle>
          <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-500)]">
            Verified, available professionals are pushed in real-time.
          </p>
        </div>
        <Badge tone="warn">
          <Zap className="h-3 w-3" /> Real-time
        </Badge>
      </CardHeader>

      <form action={createAlertAction}>
        <CardBody className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Section: WHO + WHERE */}
          <FieldGroup
            label="Who do you need?"
            hint="Only verified, available pros are matched."
            className="lg:col-span-1"
          >
            <Select name="profession" defaultValue="Registered Nurse">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFESSIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          <FieldGroup label="Location" hint="Use ‘Any’ for nationwide push.">
            <Select name="location" defaultValue={defaultLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l === "Any" ? "Any (nationwide)" : l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          {/* Section: URGENCY */}
          <FieldGroup
            label="Urgency"
            hint="Drives notification priority."
            className="lg:col-span-1"
          >
            <SegmentedRadio
              name="urgency"
              defaultValue="High"
              options={[
                {
                  value: "Standard",
                  label: "Standard",
                  tone: "sky",
                  icon: <Clock />,
                },
                {
                  value: "High",
                  label: "High",
                  tone: "amber",
                  icon: <Flame />,
                },
                {
                  value: "Critical",
                  label: "Critical",
                  tone: "rose",
                  icon: <TriangleAlert />,
                },
              ]}
            />
          </FieldGroup>

          {/* Section: EXPIRES IN */}
          <FieldGroup
            label="Expires in"
            hint="Auto-closes if no one accepts."
          >
            <SegmentedRadio
              name="expiresInMinutes"
              defaultValue="60"
              tone="violet"
              options={[
                { value: "30", label: "30m" },
                { value: "60", label: "1h" },
                { value: "180", label: "3h" },
                { value: "720", label: "12h" },
                { value: "1440", label: "24h" },
              ]}
            />
          </FieldGroup>

          {/* Section: SHIFT WINDOW */}
          <FieldGroup label="Shift starts" className="lg:col-span-1">
            <DateTimeField
              name="shiftStart"
              value={shiftStart}
              onChange={setShiftStart}
            />
          </FieldGroup>

          <FieldGroup label="Shift ends">
            <DateTimeField
              name="shiftEnd"
              value={shiftEnd}
              onChange={setShiftEnd}
            />
          </FieldGroup>

          {/* Section: PAY */}
          <FieldGroup
            label="Pay range"
            hint="Pros see this in the alert."
            className="lg:col-span-2"
          >
            {/* Two-row layout: avoids squeezing USD/ZWL/ZAR + period into one row (overflow). */}
            <div className="flex min-w-0 flex-col gap-3 overflow-hidden">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Stepper
                  name="payMin"
                  defaultValue={25}
                  min={0}
                  max={9999}
                  step={5}
                  prefix="MIN"
                  ariaLabel="Minimum pay"
                  className="min-w-0 w-full sm:flex-1 sm:max-w-[220px]"
                />
                <span
                  className="flex h-9 shrink-0 items-center px-0.5 text-[color:var(--color-ink-400)]"
                  aria-hidden
                >
                  –
                </span>
                <Stepper
                  name="payMax"
                  defaultValue={35}
                  min={0}
                  max={9999}
                  step={5}
                  prefix="MAX"
                  ariaLabel="Maximum pay"
                  className="min-w-0 w-full sm:flex-1 sm:max-w-[220px]"
                />
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <SegmentedRadio
                  name="payCurrency"
                  defaultValue="USD"
                  size="sm"
                  className="min-w-0 max-w-full"
                  options={[
                    { value: "USD", label: "USD" },
                    { value: "ZWL", label: "ZWL" },
                    { value: "ZAR", label: "ZAR" },
                  ]}
                />
                <SegmentedRadio
                  name="payPeriod"
                  defaultValue="hour"
                  size="sm"
                  className="min-w-0 max-w-full"
                  options={[
                    { value: "hour", label: "/ hr" },
                    { value: "shift", label: "/ shift" },
                    { value: "day", label: "/ day" },
                  ]}
                />
              </div>
            </div>
          </FieldGroup>

          {/* Section: NOTES */}
          <FieldGroup label="Notes" className="lg:col-span-2">
            <Textarea
              name="notes"
              rows={3}
              placeholder="Ward, equipment, special requirements — visible to recipients."
            />
          </FieldGroup>
        </CardBody>

        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)]/70 px-5 py-3">
          <div className="flex items-center gap-2 text-[11.5px] text-[color:var(--color-ink-500)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--color-brand-600)]" />
            Verified-only delivery · counts as 1 of 5 monthly alerts
          </div>
          <Button type="submit">
            <Siren className="h-3.5 w-3.5" />
            Send alert
          </Button>
        </div>
      </form>
    </Card>
  );
}

function FieldGroup({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {hint ? (
          <span className="text-[10.5px] text-[color:var(--color-ink-400)] truncate">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function DateTimeField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="group flex h-9 items-center gap-2 rounded-[10px] border border-[color:var(--color-border-default)] bg-white px-3 transition focus-within:border-[color:var(--color-brand-400)] focus-within:ring-2 focus-within:ring-[color:var(--color-brand-100)]">
      <CalendarClock className="h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
      <input
        type="datetime-local"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[13px] text-[color:var(--color-ink-900)] outline-none num tabular-nums"
      />
    </div>
  );
}

// --- date utilities ---
function roundUpToNextHour(d: Date) {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  x.setHours(x.getHours() + 1);
  return x;
}
function addHours(d: Date, h: number) {
  const x = new Date(d);
  x.setHours(x.getHours() + h);
  return x;
}
function toLocalInput(d: Date) {
  // datetime-local needs YYYY-MM-DDTHH:mm (no seconds, no zone)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
