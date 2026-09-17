"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command } from "cmdk";

import { cn } from "@/lib/cn";
import { PROFESSION_CATEGORIES } from "@/lib/professions";

export function ProfessionSelect({
  name,
  id = "profession",
  required = false,
  value,
  defaultValue = "",
  onValueChange,
  disabled = false,
  placeholder = "Search professions",
}: {
  name: string;
  id?: string;
  required?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const selected = value ?? uncontrolled;

  function select(next: string) {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
    setOpen(false);
  }

  return (
    <div className="grid gap-1.5">
      <input type="hidden" name={name} value={selected} required={required} />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-expanded={open}
            aria-controls={`${id}-listbox`}
            aria-haspopup="listbox"
            className={cn(
              "flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border bg-white px-3 text-left text-sm shadow-[var(--shadow-xs)] sm:min-h-9 sm:h-9",
              "border-[color:var(--color-border-default)] text-[color:var(--color-ink-900)]",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brand-100)] focus-visible:border-[color:var(--color-brand-500)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !selected && "text-[color:var(--color-ink-400)]",
            )}
          >
            <span className="min-w-0 flex-1 truncate">
              {selected || placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-[color:var(--color-ink-400)]" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            collisionPadding={8}
            className="wz-popover z-50 w-[var(--radix-popover-trigger-width)] min-w-[min(100%,20rem)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white shadow-[var(--shadow-lg)]"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <Command
              loop
              className="flex flex-col"
              filter={(itemValue, search) => {
                const v = itemValue.toLowerCase();
                const s = search.toLowerCase().trim();
                return !s || v.includes(s) ? 1 : 0;
              }}
            >
              <div className="border-b border-[color:var(--color-border-default)] px-2">
                <Command.Input
                  autoFocus
                  placeholder="Type to search"
                  className="flex h-11 w-full bg-transparent text-[14px] placeholder:text-[color:var(--color-ink-400)] focus:outline-none sm:h-9"
                />
              </div>
              <Command.List
                id={`${id}-listbox`}
                role="listbox"
                className="max-h-[min(60vh,20rem)] overflow-y-auto p-1"
              >
                <Command.Empty className="px-3 py-6 text-center text-[13px] text-[color:var(--color-ink-400)]">
                  No matching profession.
                </Command.Empty>
                {PROFESSION_CATEGORIES.map((category) => (
                  <Command.Group
                    key={category.id}
                    heading={category.label}
                    className="text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                  >
                    {category.professions.map((profession) => (
                      <Command.Item
                        key={profession}
                        value={`${profession} ${category.label}`}
                        onSelect={() => select(profession)}
                        className={cn(
                          "flex min-h-11 cursor-pointer select-none items-center justify-between gap-2 rounded-[6px] px-2 py-2.5 text-[13px] text-[color:var(--color-ink-700)] sm:min-h-0 sm:py-1.5",
                          "aria-selected:bg-[color:var(--color-brand-50)] aria-selected:text-[color:var(--color-brand-700)]",
                        )}
                      >
                        <span className="min-w-0 flex-1 text-left">
                          {profession}
                        </span>
                        {selected === profession ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : null}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
