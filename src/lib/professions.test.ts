import { describe, expect, it } from "vitest";

import { professionHasHpaAutoVerifyFamily, professionsCompatible } from "@/lib/registry/match";
import {
  CanonicalProfessionSchema,
  hpaAutoVerifyProfessionLabels,
  HPA_AUTO_VERIFY_PROFESSIONS,
  isCanonicalProfession,
  PROFESSION_CATEGORIES,
  PROFESSION_COUNT,
  PROFESSION_LABELS,
  professionSupportsHpaAutoVerify,
} from "./professions";

describe("canonical professions", () => {
  it("has a unique shared list with Pharmacist once", () => {
    expect(PROFESSION_COUNT).toBe(64);
    expect(PROFESSION_LABELS).toHaveLength(64);
    expect(new Set(PROFESSION_LABELS).size).toBe(PROFESSION_COUNT);
    expect(PROFESSION_LABELS.filter((label) => label === "Pharmacist")).toEqual([
      "Pharmacist",
    ]);
    expect(PROFESSION_CATEGORIES).toHaveLength(8);
  });

  it("treats only catalog titles as canonical", () => {
    expect(isCanonicalProfession("Nurse")).toBe(true);
    expect(isCanonicalProfession("Warehouse Pharmacist")).toBe(true);
    expect(isCanonicalProfession("Registered Nurse")).toBe(false);
    expect(isCanonicalProfession("Doctor")).toBe(false);
    expect(CanonicalProfessionSchema.safeParse("Pharmacist").success).toBe(true);
    expect(CanonicalProfessionSchema.safeParse("Doctor").success).toBe(false);
  });

  it("limits HPA auto-verify to matcher families already represented in the registry", () => {
    expect(hpaAutoVerifyProfessionLabels().sort()).toEqual([
      "Midwife",
      "Nurse",
      "Pharmacist",
      "Pharmacy Technician",
    ]);
    expect(professionSupportsHpaAutoVerify("Pharmacist")).toBe(true);
    expect(professionSupportsHpaAutoVerify("Pharmacy Technician")).toBe(true);
    expect(professionSupportsHpaAutoVerify("Midwife")).toBe(true);
    expect(professionSupportsHpaAutoVerify("Nurse")).toBe(true);
    expect(professionSupportsHpaAutoVerify("Warehouse Pharmacist")).toBe(false);
    expect(professionSupportsHpaAutoVerify("Quality Assurance Pharmacist")).toBe(
      false,
    );
    expect(professionSupportsHpaAutoVerify("Research Pharmacist")).toBe(false);
    expect(professionSupportsHpaAutoVerify("Nurse Anesthetist")).toBe(false);
    expect(professionSupportsHpaAutoVerify("Dentist")).toBe(false);
    expect(professionSupportsHpaAutoVerify("Medical Doctor (General Practitioner)")).toBe(
      false,
    );
    for (const label of HPA_AUTO_VERIFY_PROFESSIONS) {
      expect(professionHasHpaAutoVerifyFamily(label)).toBe(true);
    }
    expect(professionsCompatible("Warehouse Pharmacist", "PHARMACIST")).toBe(
      false,
    );
    expect(professionsCompatible("Dentist", "DENTIST")).toBe(false);
  });
});
