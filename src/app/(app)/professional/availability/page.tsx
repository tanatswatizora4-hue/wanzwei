import { CalendarClock, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mvpSurfaceUnavailable } from "@/lib/nav/mvp-unavailable";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SLOTS: { day: number; start: string; end: string; tone: "emerald" | "amber" }[] = [
  { day: 0, start: "08:00", end: "16:00", tone: "emerald" },
  { day: 1, start: "08:00", end: "16:00", tone: "emerald" },
  { day: 2, start: "14:00", end: "22:00", tone: "amber" },
  { day: 3, start: "08:00", end: "16:00", tone: "emerald" },
  { day: 4, start: "08:00", end: "12:00", tone: "amber" },
];

export default async function AvailabilityPage() {
  mvpSurfaceUnavailable();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Availability"
        description="Let facilities know when you're free for locum shifts and interviews."
        actions={
          <Button>
            <Plus className="h-3.5 w-3.5" /> Add slot
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardBody>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border-default)]">
              <div className="grid grid-cols-7 bg-[color:var(--color-surface-muted)] text-center text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                {DAYS.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-[color:var(--color-border-default)] bg-white">
                {DAYS.map((_, idx) => {
                  const slot = SLOTS.find((s) => s.day === idx);
                  return (
                    <div
                      key={idx}
                      className="min-h-[140px] p-2 hover:bg-[color:var(--color-ink-900)]/[0.02]"
                    >
                      {slot ? (
                        <div
                          className={`rounded-[var(--radius-sm)] px-2 py-1.5 text-[11.5px] ${slot.tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                        >
                          <p className="font-semibold">
                            {slot.start} – {slot.end}
                          </p>
                          <p className="text-[10.5px] mt-0.5">
                            {slot.tone === "emerald" ? "Day shift" : "Evening"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[color:var(--color-ink-300)] text-center mt-12">
                          —
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardBody className="pt-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Status
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700">
                <span className="size-2 rounded-full bg-emerald-500" />
                Available for shifts
              </div>
              <p className="mt-3 text-[12px] text-[color:var(--color-ink-500)]">
                Facilities can request you for matching shifts within your
                published availability.
              </p>
              <Button className="mt-4 w-full" variant="secondary" size="sm">
                Set away
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="pt-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Upcoming
              </p>
              <ul className="mt-3 flex flex-col gap-2.5">
                <li className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-[color:var(--color-ink-400)]" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold">Locum night shift</p>
                    <p className="text-[11.5px] text-[color:var(--color-ink-500)]">
                      Avenues Clinic · May 16, 22:00 – 06:00
                    </p>
                  </div>
                  <Badge tone="violet">Confirmed</Badge>
                </li>
                <li className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-[color:var(--color-ink-400)]" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold">Interview</p>
                    <p className="text-[11.5px] text-[color:var(--color-ink-500)]">
                      Parirenyatwa · May 14, 10:00
                    </p>
                  </div>
                  <Badge tone="info">Scheduled</Badge>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
