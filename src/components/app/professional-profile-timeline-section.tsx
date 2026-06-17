"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ProfileTimelineSeed = {
  title: string;
  org: string;
  meta: string;
  body: string;
};

type ProfileTimelineRow = ProfileTimelineSeed & { id: string };

function buildTimelineRows(initial: ProfileTimelineSeed[]): ProfileTimelineRow[] {
  return initial.map((item, idx) => ({
    ...item,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `timeline-${idx}-${item.title}`,
  }));
}

function TimelineList({
  items,
}: {
  items: ProfileTimelineRow[];
}) {
  return (
    <ol className="relative">
      {items.map((i, idx) => (
        <li key={i.id} className="relative pl-7 pb-5 last:pb-0">
          <span className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          {idx !== items.length - 1 ? (
            <span className="absolute left-[9px] top-7 bottom-0 w-px bg-[color:var(--color-border-default)]" />
          ) : null}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13.5px] font-semibold">{i.title}</p>
              <span className="text-[11.5px] text-[color:var(--color-ink-400)]">
                {i.meta}
              </span>
            </div>
            <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
              {i.org}
            </p>
            <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
              {i.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const emptyDraft = (): ProfileTimelineSeed => ({
  title: "",
  org: "",
  meta: "",
  body: "",
});

export function ProfessionalProfileTimelineSection(props: {
  icon: React.ReactNode;
  title: string;
  actionLabel: string;
  dialogTitle: string;
  dialogDescription?: string;
  titleFieldLabel: string;
  orgFieldLabel: string;
  metaFieldLabel: string;
  metaPlaceholder?: string;
  bodyFieldLabel: string;
  initialItems: ProfileTimelineSeed[];
}) {
  const {
    icon,
    title,
    actionLabel,
    dialogTitle,
    dialogDescription,
    titleFieldLabel,
    orgFieldLabel,
    metaFieldLabel,
    metaPlaceholder,
    bodyFieldLabel,
    initialItems,
  } = props;

  const [items, setItems] = React.useState<ProfileTimelineRow[]>(() =>
    buildTimelineRows(initialItems),
  );
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(emptyDraft);
  const formId = React.useId();

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setDraft(emptyDraft());
    }
  }, []);

  const submit = React.useCallback(() => {
    const t = draft.title.trim();
    const org = draft.org.trim();
    if (!t || !org) {
      toast.error(`Please fill in ${titleFieldLabel.toLowerCase()} and ${orgFieldLabel.toLowerCase()}.`);
      return;
    }
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${t}`;
    setItems((prev) => [
      {
        id,
        title: t,
        org,
        meta: draft.meta.trim() || "—",
        body: draft.body.trim() || "—",
      },
      ...prev,
    ]);
    setOpen(false);
    toast.success("Added (saved until you reload the page)");
  }, [draft, titleFieldLabel, orgFieldLabel]);

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
              {icon}
            </span>
            <p className="text-[14px] font-semibold">{title}</p>
          </div>
          <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(true)}>
            + {actionLabel}
          </Button>
        </div>
        <div className="mt-4">
          {items.length === 0 ? (
            <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
              No entries yet.
            </p>
          ) : (
            <TimelineList items={items} />
          )}
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              {dialogDescription ? (
                <DialogDescription>{dialogDescription}</DialogDescription>
              ) : null}
            </DialogHeader>
            <form
              className="contents"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor={`${formId}-title`}>{titleFieldLabel}</Label>
                  <Input
                    id={`${formId}-title`}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, title: e.target.value }))
                    }
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${formId}-org`}>{orgFieldLabel}</Label>
                  <Input
                    id={`${formId}-org`}
                    value={draft.org}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, org: e.target.value }))
                    }
                    autoComplete="organization"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${formId}-meta`}>{metaFieldLabel}</Label>
                  <Input
                    id={`${formId}-meta`}
                    value={draft.meta}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, meta: e.target.value }))
                    }
                    placeholder={metaPlaceholder}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${formId}-body`}>{bodyFieldLabel}</Label>
                  <Textarea
                    id={`${formId}-body`}
                    value={draft.body}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, body: e.target.value }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  className="sm:mt-0"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardBody>
    </Card>
  );
}
