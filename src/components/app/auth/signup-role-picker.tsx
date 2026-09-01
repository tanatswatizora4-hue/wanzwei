"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { Input, Label } from "@/components/ui/input";
import { FacilityTypeSchema } from "@/lib/validation/auth";

type SignupRole = "professional" | "facility";

const FACILITY_TYPES = FacilityTypeSchema.options;

const nativeSelectClassName = cn(
  "flex h-9 w-full rounded-[var(--radius-sm)] border bg-white px-3 text-sm",
  "border-[color:var(--color-border-default)] text-[color:var(--color-ink-900)]",
  "shadow-[var(--shadow-xs)] transition-colors",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brand-100)] focus-visible:border-[color:var(--color-brand-500)]",
);

export function SignupRolePicker({
  defaultRole,
}: {
  defaultRole: SignupRole;
}) {
  const [selectedRole, setSelectedRole] = useState<SignupRole>(defaultRole);

  return (
    <>
      <input type="hidden" name="role" value={selectedRole} />

      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={selectedRole === "professional"}
          onClick={() => setSelectedRole("professional")}
          className={cn(
            "rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 py-3 text-left transition-all",
            selectedRole === "professional" &&
              "border-[color:var(--color-brand-500)] ring-[3px] ring-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)]",
          )}
        >
          <p className="text-[13px] font-semibold text-[color:var(--color-ink-900)]">
            Professional
          </p>
          <p className="mt-0.5 text-[11.5px] text-[color:var(--color-ink-500)]">
            Find locum, contract or permanent roles
          </p>
        </button>

        <button
          type="button"
          aria-pressed={selectedRole === "facility"}
          onClick={() => setSelectedRole("facility")}
          className={cn(
            "rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 py-3 text-left transition-all",
            selectedRole === "facility" &&
              "border-[color:var(--color-brand-500)] ring-[3px] ring-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)]",
          )}
        >
          <p className="text-[13px] font-semibold text-[color:var(--color-ink-900)]">
            Facility
          </p>
          <p className="mt-0.5 text-[11.5px] text-[color:var(--color-ink-500)]">
            Post roles, hire verified talent
          </p>
        </button>
      </div>

      {selectedRole === "facility" ? (
        <div className="mt-3.5 flex flex-col gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="organisationName">Organisation name</Label>
            <Input
              id="organisationName"
              name="organisationName"
              placeholder="Cure Hospital"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="location">City / location</Label>
            <Input
              id="location"
              name="location"
              placeholder="Harare"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="facilityType">Facility type</Label>
            <select
              id="facilityType"
              name="facilityType"
              required
              defaultValue=""
              className={nativeSelectClassName}
            >
              <option value="" disabled>
                Select type
              </option>
              {FACILITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </>
  );
}
