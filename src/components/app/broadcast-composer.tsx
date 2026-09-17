"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  improveBroadcastCopyAction,
  interpretBroadcastTargetingAction,
  previewBroadcastAction,
  sendBroadcastAction,
} from "@/app/(app)/facility/broadcasts/actions";
import { ProfessionSelect } from "@/components/app/profession-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { emptyTargetingCriteria } from "@/lib/broadcasts/criteria";
import {
  BROADCAST_TYPE_LABELS,
  BROADCAST_TYPES,
  NETWORK_RELATIONSHIP_LABELS,
  NETWORK_RELATIONSHIP_TYPES,
  type BroadcastType,
  type PreviewProfessional,
  type TargetingCriteria,
} from "@/lib/broadcasts/network-types";

type FacilityJobOption = { id: string; title: string };

export function BroadcastComposer({
  defaultLocation,
  jobs,
  canSendEmergency,
  canSendRecruitment,
  geminiConfigured,
}: {
  defaultLocation: string;
  jobs: FacilityJobOption[];
  canSendEmergency: boolean;
  canSendRecruitment: boolean;
  geminiConfigured: boolean;
}) {
  const router = useRouter();
  const allowedTypes = BROADCAST_TYPES.filter((type) =>
    type === "emergency" ? canSendEmergency : canSendRecruitment,
  );
  const [type, setType] = React.useState<BroadcastType>(
    allowedTypes[0] ?? "locum",
  );
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [location, setLocation] = React.useState(defaultLocation);
  const [positionsNeeded, setPositionsNeeded] = React.useState("");
  const [shiftStart, setShiftStart] = React.useState("");
  const [shiftEnd, setShiftEnd] = React.useState("");
  const [jobId, setJobId] = React.useState("");
  const [intent, setIntent] = React.useState("");
  const [criteria, setCriteria] = React.useState<TargetingCriteria>(() =>
    emptyTargetingCriteria(),
  );
  const [professionDraft, setProfessionDraft] = React.useState("");
  const [preview, setPreview] = React.useState<{
    count: number;
    professionals: PreviewProfessional[];
    summaryLines: string[];
  } | null>(null);
  const [payMin, setPayMin] = React.useState("10");
  const [payMax, setPayMax] = React.useState("25");
  const [urgency, setUrgency] = React.useState<"Standard" | "High" | "Critical">(
    "High",
  );
  const [busy, setBusy] = React.useState<string | null>(null);

  const excluded = new Set(criteria.excludeProfessionalIds);

  function updateCriteria(patch: Partial<TargetingCriteria>) {
    setCriteria((current) => ({ ...current, ...patch }));
    setPreview(null);
  }

  async function interpret() {
    if (!intent.trim()) {
      toast.error("Describe who should receive this.");
      return;
    }
    setBusy("interpret");
    try {
      const result = await interpretBroadcastTargetingAction({ intent });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCriteria(result.criteria);
      setPreview(null);
      toast.success("Review the interpreted filters before sending.");
    } finally {
      setBusy(null);
    }
  }

  async function improveCopy() {
    if (!title.trim() || !message.trim()) {
      toast.error("Add a title and message first.");
      return;
    }
    setBusy("copy");
    try {
      const result = await improveBroadcastCopyAction({ title, message });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTitle(result.title);
      setMessage(result.message);
      toast.success("Review the rewritten advert before sending.");
    } finally {
      setBusy(null);
    }
  }

  async function previewAudience() {
    setBusy("preview");
    try {
      const result = await previewBroadcastAction({ type, criteria });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCriteria(result.criteria);
      setPreview({
        count: result.count,
        professionals: result.professionals,
        summaryLines: result.summaryLines,
      });
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    try {
      const result = await sendBroadcastAction({
        type,
        title,
        message,
        location,
        positionsNeeded: positionsNeeded || undefined,
        shiftStart: shiftStart || undefined,
        shiftEnd: shiftEnd || undefined,
        jobId: jobId || undefined,
        criteria,
        urgency: type === "emergency" ? urgency : undefined,
        payMin: type === "emergency" ? Number(payMin) : undefined,
        payMax: type === "emergency" ? Number(payMax) : undefined,
        payCurrency: type === "emergency" ? "USD" : undefined,
        payPeriod: type === "emergency" ? "shift" : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sent to ${result.count} professionals`);
      router.push("/facility/broadcasts");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function toggleExclude(id: string) {
    const next = new Set(criteria.excludeProfessionalIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateCriteria({ excludeProfessionalIds: [...next] });
  }

  function addProfession() {
    if (!professionDraft) return;
    if (criteria.professions.includes(professionDraft)) return;
    updateCriteria({ professions: [...criteria.professions, professionDraft] });
    setProfessionDraft("");
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Broadcast details</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Broadcast type">
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as BroadcastType);
                setPreview(null);
              }}
              className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
            >
              {allowedTypes.map((item) => (
                <option key={item} value={item}>
                  {BROADCAST_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <Input value={location} onChange={(event) => setLocation(event.target.value)} />
          </Field>
          <Field label="Title" className="lg:col-span-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Message" className="lg:col-span-2">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
            />
          </Field>
          <Field label="Positions needed">
            <Input
              type="number"
              min={1}
              value={positionsNeeded}
              onChange={(event) => setPositionsNeeded(event.target.value)}
            />
          </Field>
          <Field label="Link existing job (optional)">
            <select
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
            >
              <option value="">None</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Shift start">
            <Input
              type="datetime-local"
              value={shiftStart}
              onChange={(event) => setShiftStart(event.target.value)}
            />
          </Field>
          <Field label="Shift end">
            <Input
              type="datetime-local"
              value={shiftEnd}
              onChange={(event) => setShiftEnd(event.target.value)}
            />
          </Field>
          {type === "emergency" ? (
            <>
              <Field label="Urgency">
                <select
                  value={urgency}
                  onChange={(event) =>
                    setUrgency(event.target.value as "Standard" | "High" | "Critical")
                  }
                  className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
                >
                  <option value="Standard">Standard</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pay min (USD)">
                  <Input value={payMin} onChange={(event) => setPayMin(event.target.value)} />
                </Field>
                <Field label="Pay max (USD)">
                  <Input value={payMax} onChange={(event) => setPayMax(event.target.value)} />
                </Field>
              </div>
            </>
          ) : null}
          {geminiConfigured ? (
            <div className="lg:col-span-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void improveCopy()}
                disabled={busy != null}
              >
                {busy === "copy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Improve this advert
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who should receive this?</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div>
            <Label htmlFor="intent">Targeting intent</Label>
            <Textarea
              id="intent"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              placeholder="Only send this to verified nurses in our approved locum pool."
              rows={3}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void interpret()}
                disabled={busy != null || !geminiConfigured}
              >
                {busy === "interpret" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Interpret with AI
              </Button>
              {!geminiConfigured ? (
                <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                  AI is not configured. Set filters manually.
                </p>
              ) : null}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={criteria.verifiedOnly || type === "emergency"}
              disabled={type === "emergency"}
              onChange={(event) =>
                updateCriteria({ verifiedOnly: event.target.checked })
              }
            />
            Verified professionals only
            {type === "emergency" ? " (required for emergency)" : ""}
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={criteria.networkOnly || type === "internal_locum"}
              disabled={type === "internal_locum"}
              onChange={(event) =>
                updateCriteria({ networkOnly: event.target.checked })
              }
            />
            Only this facility&apos;s professional network
            {type === "internal_locum" ? " (required for internal locum)" : ""}
          </label>

          <div>
            <Label>Professions</Label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <ProfessionSelect
                  name="professionDraft"
                  value={professionDraft}
                  onValueChange={setProfessionDraft}
                />
              </div>
              <Button type="button" variant="secondary" onClick={addProfession}>
                Add profession
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {criteria.professions.map((profession) => (
                <button
                  key={profession}
                  type="button"
                  className="inline-flex"
                  onClick={() =>
                    updateCriteria({
                      professions: criteria.professions.filter((item) => item !== profession),
                    })
                  }
                >
                  <Badge tone="brand">{profession} ×</Badge>
                </button>
              ))}
            </div>
          </div>

          <Field label="Locations (comma-separated stored text)">
            <Input
              value={criteria.locations.join(", ")}
              onChange={(event) =>
                updateCriteria({
                  locations: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>

          <div>
            <Label>Network relationship types</Label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {NETWORK_RELATIONSHIP_TYPES.map((relationship) => {
                const checked = criteria.relationshipTypes.includes(relationship);
                return (
                  <label key={relationship} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...criteria.relationshipTypes, relationship]
                          : criteria.relationshipTypes.filter((item) => item !== relationship);
                        updateCriteria({ relationshipTypes: next });
                      }}
                    />
                    {NETWORK_RELATIONSHIP_LABELS[relationship]}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void previewAudience()}
              disabled={busy != null}
            >
              {busy === "preview" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Preview audience
            </Button>
            <Button type="button" onClick={() => void send()} disabled={busy != null}>
              {busy === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Send broadcast
            </Button>
          </div>
        </CardBody>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Audience preview</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {preview.summaryLines.map((line) => (
              <p key={line} className="text-[13px] text-[color:var(--color-ink-700)]">
                {line}
              </p>
            ))}
            <p className="font-display text-[18px] font-semibold">
              {preview.count} professionals match
            </p>
            <ul className="flex flex-col gap-2">
              {preview.professionals.slice(0, 50).map((professional) => (
                <li
                  key={professional.id}
                  className="flex min-w-0 items-center justify-between gap-3 border-b border-[color:var(--color-border-default)] pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{professional.name}</p>
                    <p className="truncate text-[12px] text-[color:var(--color-ink-500)]">
                      {professional.profession ?? "Profession not set"}
                      {professional.location ? ` · ${professional.location}` : ""}
                      {professional.verified ? " · Verified" : " · Unverified"}
                    </p>
                  </div>
                  <label className="flex shrink-0 items-center gap-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={excluded.has(professional.id)}
                      onChange={() => toggleExclude(professional.id)}
                    />
                    Exclude
                  </label>
                </li>
              ))}
            </ul>
            {preview.professionals.length > 50 ? (
              <p className="text-[12px] text-[color:var(--color-ink-500)]">
                Showing 50 of {preview.professionals.length}. Send still uses the full
                server-matched set after exclusions.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
