import { describe, expect, it } from "vitest";

import {
  canAdminManageCourses,
  canProfessionalEnrol,
  canProfessionalMutateEnrolment,
} from "./ownership";

describe("CPD ownership", () => {
  it("lets a professional mutate only their own enrolment", () => {
    expect(
      canProfessionalMutateEnrolment({
        actor: { role: "professional", id: "pro-1" },
        enrolmentUserId: "pro-1",
      }),
    ).toBe(true);
    expect(
      canProfessionalMutateEnrolment({
        actor: { role: "professional", id: "pro-1" },
        enrolmentUserId: "pro-2",
      }),
    ).toBe(false);
    expect(
      canProfessionalMutateEnrolment({
        actor: { role: "facility", id: "fac-1" },
        enrolmentUserId: "pro-1",
      }),
    ).toBe(false);
    expect(
      canProfessionalMutateEnrolment({
        actor: null,
        enrolmentUserId: "pro-1",
      }),
    ).toBe(false);
  });

  it("restricts enrolment to professionals and catalogue management to admins", () => {
    expect(canProfessionalEnrol({ actor: { role: "professional", id: "p" } })).toBe(
      true,
    );
    expect(canProfessionalEnrol({ actor: { role: "facility", id: "f" } })).toBe(
      false,
    );
    expect(canAdminManageCourses({ actor: { role: "admin" } })).toBe(true);
    expect(canAdminManageCourses({ actor: { role: "professional" } })).toBe(
      false,
    );
  });
});
