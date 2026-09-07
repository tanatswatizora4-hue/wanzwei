"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { Input, Label, FieldHint } from "@/components/ui/input";
import { ProfessionSelect } from "@/components/app/profession-select";
import {
  professionSupportsHpaAutoVerify,
} from "@/lib/professions";
import { FacilityTypeSchema } from "@/lib/validation/auth";

type SignupRole = "professional" | "facility";

const FACILITY_TYPES = FacilityTypeSchema.options;

const nativeSelectClassName = cn(
  "flex min-h-11 w-full rounded-[var(--radius-sm)] border bg-white px-3 text-sm sm:h-9 sm:min-h-9",
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
  const [profession, setProfession] = useState("");

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
            Post roles and review applicants
          </p>
        </button>
      </div>

      {selectedRole === "professional" ? (
        <div className="mt-3.5 grid gap-1.5">
          <Label htmlFor="profession">Profession</Label>
          <ProfessionSelect
            name="profession"
            required
            value={profession}
            onValueChange={setProfession}
          />
          <FieldHint>
            {profession && !professionSupportsHpaAutoVerify(profession)
              ? "This profession is not in the HPA auto-match register yet. You can still create an account; credentials may require manual review."
              : profession
                ? "After signup you can submit your HPA registration for automatic matching where the register supports it."
                : "Search and select your profession."}
          </FieldHint>
        </div>
      ) : (
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
            <Label htmlFor="premisesNumber">Premises registration number</Label>
            <Input
              id="premisesNumber"
              name="premisesNumber"
              placeholder="W01-2026-1234"
              autoComplete="off"
            />
            <FieldHint>
              Enter the premises registration number issued to your facility.
              Submitting a number does not verify the facility.
            </FieldHint>
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
      )}
    </>
  );
}
