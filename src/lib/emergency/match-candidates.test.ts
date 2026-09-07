import { describe, expect, it } from "vitest";

import type { User } from "@/lib/types";
import {
  batchWithoutDropping,
  filterEligibleEmergencyProfessionals,
  recipientsForEmergencyAlert,
} from "./match-candidates";

function professional(overrides: Partial<User>): User {
  return {
    id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
    email: overrides.email ?? "pro@example.com",
    role: "professional",
    name: overrides.name ?? "Pro",
    verified: true,
    profession: "Nurse",
    location: "Harare",
    ...overrides,
  };
}

function many(count: number): User[] {
  return Array.from({ length: count }, (_, index) =>
    professional({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      email: `pro${index + 1}@example.com`,
      name: `Pro ${index + 1}`,
    }),
  );
}

describe("emergency candidate matching", () => {
  it("returns 0, 1, 5, 6, 8, 9, 10, 25, 26, and more eligible professionals without capping", () => {
    for (const count of [0, 1, 5, 6, 8, 9, 10, 25, 26, 30]) {
      const eligible = filterEligibleEmergencyProfessionals(many(count), {
        profession: "Nurse",
        location: "Harare",
      });
      expect(eligible).toHaveLength(count);
      expect(recipientsForEmergencyAlert(eligible)).toHaveLength(count);
    }
  });

  it("excludes unverified professionals", () => {
    const eligible = filterEligibleEmergencyProfessionals(
      [
        professional({ id: "a", verified: false, email: "u@example.com" }),
        professional({ id: "b", verified: true, email: "v@example.com" }),
      ],
      { profession: "Nurse", location: "Harare" },
    );
    expect(eligible.map((row) => row.id)).toEqual(["b"]);
  });

  it("excludes the wrong profession", () => {
    const eligible = filterEligibleEmergencyProfessionals(
      [
        professional({ id: "a", profession: "Pharmacist" }),
        professional({ id: "b", profession: "Nurse" }),
      ],
      { profession: "Nurse", location: "Harare" },
    );
    expect(eligible.map((row) => row.id)).toEqual(["b"]);
  });

  it("does not let notification batching drop recipients for 25+1", () => {
    const eligible = many(26);
    const batches = batchWithoutDropping(eligible, 25);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(25);
    expect(batches[1]).toHaveLength(1);
    expect(batches.flat()).toHaveLength(26);
  });
});
