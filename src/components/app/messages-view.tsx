import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { FacilityLogo } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Facility } from "@/lib/types";

type Thread = {
  id: string;
  facility: Facility;
  title: string;
  preview: string;
  time: string;
  unread: number;
};

export function MessagesView({ threads }: { threads: Thread[] }) {
  const active = threads[0];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Messages" description="Threaded conversations with hiring teams." />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-r border-[color:var(--color-border-default)]">
            <div className="p-3 border-b border-[color:var(--color-border-default)]">
              <Input placeholder="Search messages" />
            </div>
            <ul className="divide-y divide-[color:var(--color-border-default)]">
              {threads.map((t, i) => (
                <li
                  key={t.id}
                  className={`flex items-start gap-3 px-3 py-3 cursor-pointer ${i === 0 ? "bg-[color:var(--color-brand-50)]" : "hover:bg-[color:var(--color-ink-900)]/[0.025]"}`}
                >
                  <FacilityLogo
                    initials={t.facility.initials}
                    gradient={t.facility.logoColor}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold">
                        {t.facility.name}
                      </p>
                      <span className="text-[10.5px] text-[color:var(--color-ink-400)] shrink-0">
                        {t.time}
                      </span>
                    </div>
                    <p className="truncate text-[11.5px] text-[color:var(--color-ink-500)]">
                      {t.title}
                    </p>
                    <p className="truncate text-[12px] text-[color:var(--color-ink-500)] mt-0.5">
                      {t.preview}
                    </p>
                  </div>
                  {t.unread > 0 ? (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--color-brand-600)] px-1.5 text-[10.5px] font-semibold text-white">
                      {t.unread}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col min-h-[480px]">
            <div className="flex items-center gap-3 border-b border-[color:var(--color-border-default)] px-5 py-3">
              <FacilityLogo
                initials={active.facility.initials}
                gradient={active.facility.logoColor}
                size={36}
              />
              <div>
                <p className="text-[13.5px] font-semibold">
                  {active.facility.name}
                </p>
                <p className="text-[11.5px] text-[color:var(--color-ink-500)]">
                  Talent team · usually replies in 1h
                </p>
              </div>
              <Badge tone="success" withDot className="ml-auto">
                Verified
              </Badge>
            </div>

            <CardBody className="flex-1 flex flex-col gap-3 py-5">
              <div className="self-start max-w-[80%] rounded-[var(--radius-md)] bg-[color:var(--color-surface-muted)] px-3 py-2 text-[13px]">
                <p>
                  Hi — your CV looks great. Could you confirm your availability
                  for the week of May 19?
                </p>
                <p className="mt-1 text-[10.5px] text-[color:var(--color-ink-400)]">
                  {active.facility.name} · 12 min ago
                </p>
              </div>
              <div className="self-end max-w-[80%] rounded-[var(--radius-md)] bg-[color:var(--color-brand-600)] px-3 py-2 text-[13px] text-white">
                <p>
                  Hi! Yes — I&apos;m available Monday to Thursday that week, day or
                  evening shifts work.
                </p>
                <p className="mt-1 text-[10.5px] text-white/70">
                  You · 8 min ago
                </p>
              </div>
              <div className="self-start max-w-[80%] rounded-[var(--radius-md)] bg-[color:var(--color-surface-muted)] px-3 py-2 text-[13px]">
                Perfect — sending an interview invite now.
              </div>
            </CardBody>

            <div className="border-t border-[color:var(--color-border-default)] p-3 flex items-center gap-2">
              <Input placeholder="Write a message…" className="flex-1" />
              <Button>
                <MessageSquare className="h-4 w-4" /> Send
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
